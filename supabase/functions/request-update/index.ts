import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestUpdateBody {
  id: string;
  email: string;
  changes: Record<string, unknown>;
  original?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as RequestUpdateBody;
    const id = (body?.id || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const changes = body?.changes || {};

    if (!id || !email) {
      return new Response(JSON.stringify({ error: "Missing id or email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
      return new Response(JSON.stringify({ error: "No changes provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const MAKE_UPDATE_WEBHOOK_URL = Deno.env.get("MAKE_UPDATE_WEBHOOK_URL") || Deno.env.get("MAKE_WEBHOOK_URL");
    if (!MAKE_UPDATE_WEBHOOK_URL) {
      throw new Error("Missing MAKE_UPDATE_WEBHOOK_URL or MAKE_WEBHOOK_URL secret");
    }

    const payload = {
      action: "update_fiche",
      id,
      email,
      changes,
      original: body?.original || null,
      requested_at: new Date().toISOString(),
      requested_by: email,
    };

    const resp = await fetch(MAKE_UPDATE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Make webhook failed: ${resp.status} ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("request-update error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
