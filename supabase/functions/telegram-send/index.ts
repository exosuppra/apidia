import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chat_id, text } = await req.json();

    if (!chat_id || !text) {
      return new Response(JSON.stringify({ error: "chat_id and text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

    // Send message via Telegram
    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Telegram API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    const messageId = data.result?.message_id;
    const messageDate = data.result?.date || Math.floor(Date.now() / 1000);

    // Store outgoing message
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("telegram_messages").insert({
      chat_id,
      text,
      direction: "outgoing",
      sender_name: "OTO Bot",
    });

    // Notify Make webhook with Telegram-like payload
    const makeWebhookUrl = Deno.env.get("MAKE_OTO_WEBHOOK_URL");
    let makeNotified = false;
    let makeStatus = "no_webhook";
    let makeError: string | null = null;

    if (makeWebhookUrl) {
      try {
        // Build a Telegram-like update structure so Make can parse it
        const syntheticUpdate = {
          update_id: messageId || Math.floor(Date.now() / 1000),
          message: {
            message_id: messageId,
            date: messageDate,
            chat: {
              id: chat_id,
              first_name: "User",
              type: "private",
            },
            from: {
              id: chat_id,
              is_bot: false,
              first_name: "OTO Admin",
              username: "oto_admin",
            },
            text: text,
          },
        };

        const makeResp = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syntheticUpdate),
        });

        makeStatus = String(makeResp.status);
        makeNotified = makeResp.ok;

        if (!makeResp.ok) {
          const makeBody = await makeResp.text();
          makeError = `Make webhook returned ${makeResp.status}: ${makeBody.substring(0, 200)}`;
          console.error("Make webhook error:", makeError);
        }
      } catch (webhookErr) {
        makeStatus = "fetch_error";
        makeError = webhookErr instanceof Error ? webhookErr.message : "Unknown error";
        console.error("Failed to notify Make webhook:", webhookErr);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      message_id: messageId,
      telegram_sent: true,
      make_notified: makeNotified,
      make_status: makeStatus,
      make_error: makeError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-send error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
