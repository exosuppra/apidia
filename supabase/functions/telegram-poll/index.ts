import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const makeWebhookUrl = Deno.env.get("MAKE_OTO_WEBHOOK_URL");

  // Delete any active webhook before polling
  const delWh = await fetch(`${GATEWAY_URL}/deleteWebhook`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ drop_pending_updates: false }),
  });
  try {
    const delWhData = await delWh.json();
    if (!delWh.ok) console.error("deleteWebhook failed:", delWhData);
  } catch {
    const delWhText = await delWh.text().catch(() => "");
    if (!delWh.ok) console.error("deleteWebhook failed (non-JSON):", delWhText);
  }

  let totalProcessed = 0;

  const { data: state, error: stateErr } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ["message"],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Telegram getUpdates error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Separate bot messages (outgoing) from user messages (incoming)
    const rows = [];
    const userUpdates = []; // real user messages to forward to Make

    for (const u of updates) {
      if (!u.message) continue;

      const isBot = u.message.from?.is_bot === true;

      if (isBot) {
        // Bot's own replies — store as outgoing, skip if already stored by telegram-send
        // Check if we already have a recent outgoing message with same chat_id + text (from telegram-send)
        const { data: existing } = await supabase
          .from("telegram_messages")
          .select("id")
          .eq("chat_id", u.message.chat.id)
          .eq("direction", "outgoing")
          .eq("text", u.message.text ?? "")
          .gte("created_at", new Date(Date.now() - 60_000).toISOString()) // within last 60s
          .limit(1);

        if (existing && existing.length > 0) {
          // Already stored by telegram-send, skip duplicate
          console.log(`Skipping duplicate bot message in chat ${u.message.chat.id}`);
          continue;
        }

        rows.push({
          update_id: u.update_id,
          chat_id: u.message.chat.id,
          text: u.message.text ?? null,
          direction: "outgoing",
          sender_name: "OTO Bot",
          raw_update: u,
        });
      } else {
        // Real user message — store as incoming
        rows.push({
          update_id: u.update_id,
          chat_id: u.message.chat.id,
          text: u.message.text ?? null,
          direction: "incoming",
          sender_name: [u.message.from?.first_name, u.message.from?.last_name].filter(Boolean).join(" ") || "Inconnu",
          raw_update: u,
        });
        userUpdates.push(u);
      }
    }

    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("telegram_messages")
        .upsert(rows, { onConflict: "update_id" });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      totalProcessed += rows.length;
    }

    // Notify Make webhook for each real user message
    if (makeWebhookUrl && userUpdates.length > 0) {
      for (const u of userUpdates) {
        try {
          const makeResp = await fetch(makeWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          });
          if (!makeResp.ok) {
            const body = await makeResp.text();
            console.error(`Make webhook error for update ${u.update_id}: ${makeResp.status} - ${body.substring(0, 200)}`);
          } else {
            await makeResp.text(); // consume body
            console.log(`Make notified for user message update_id=${u.update_id}`);
          }
        } catch (err) {
          console.error(`Make webhook fetch error for update ${u.update_id}:`, err);
        }
      }
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;

    await supabase
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);

    currentOffset = newOffset;
  }

  return new Response(
    JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
