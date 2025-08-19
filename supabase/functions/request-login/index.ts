import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestLoginBody {
  id: string;
  email: string;
  redirectUrl?: string;
}

function normalize(str: string) {
  return (str || "").trim();
}

function normalizeEmail(str: string) {
  return normalize(str).toLowerCase();
}

async function findUserInSheet(sheetId: string, serviceAccountJson: string, id: string, email: string) {
  const sa = JSON.parse(serviceAccountJson || "{}");
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON secret: missing client_email/private_key");
  }

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: (sa.private_key as string).replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Read header + rows from ENT LOGIN sheet (A:Z to cover typical columns)
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "ENT LOGIN!A:Z",
    majorDimension: "ROWS",
  });

  const rows = resp.data.values || [];
  if (rows.length === 0) return null;

  const header = rows[0].map((h: string) => h.toString().trim().toLowerCase());
  const idIdx = header.findIndex((h: string) => ["id", "user_id", "identifiant"].includes(h));
  const emailIdx = header.findIndex((h: string) => ["email", "e-mail", "mail"].includes(h));

  if (idIdx === -1 || emailIdx === -1) {
    throw new Error("Sheet headers must include 'id' and 'email' (case-insensitive)");
  }

  const wantedId = normalize(id);
  const wantedEmail = normalizeEmail(email);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowId = normalize(row[idIdx] ?? "");
    const rowEmail = normalizeEmail(row[emailIdx] ?? "");
    if (rowId && rowEmail && rowId === wantedId && rowEmail === wantedEmail) {
      return { id: rowId, email: rowEmail };
    }
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

    const body = (await req.json()) as RequestLoginBody;
    const id = normalize(body?.id);
    const email = normalize(body?.email);
    const redirectUrl = body?.redirectUrl || `${new URL(req.url).origin}/`; // fallback to site root

    if (!id || !email) {
      return new Response(JSON.stringify({ error: "Missing id or email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://krmeineyonriifvoexkx.supabase.co";

    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_ID secret");
    if (!SA_JSON) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON secret");
    if (!SERVICE_ROLE) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY secret");

    const match = await findUserInSheet(SHEET_ID, SA_JSON, id, email);
    if (!match) {
      return new Response(JSON.stringify({ error: "ID/email non trouvés ou non autorisés" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email: match.email,
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Lien magique envoyé si l'email est valide." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("request-login error:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
