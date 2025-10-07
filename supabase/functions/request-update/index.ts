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

// Validation constants
const MAX_ID_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

function validateInput(id: string, email: string, changes: unknown): string | null {
  if (!id || id.length === 0) return "ID manquant";
  if (id.length > MAX_ID_LENGTH) return `ID trop long (max ${MAX_ID_LENGTH} caractères)`;
  
  if (!email || email.length === 0) return "Email manquant";
  if (email.length > MAX_EMAIL_LENGTH) return `Email trop long (max ${MAX_EMAIL_LENGTH} caractères)`;
  if (!EMAIL_REGEX.test(email)) return "Format d'email invalide";
  
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return "Changes doit être un objet";
  }
  
  if (Object.keys(changes).length === 0) {
    return "Aucune modification fournie";
  }
  
  return null;
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

    // Check payload size
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(JSON.stringify({ error: "Payload trop volumineux" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as RequestUpdateBody;
    const id = (body?.id || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const changes = body?.changes || {};

    // Validate input
    const validationError = validateInput(id, email, changes);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
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
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
