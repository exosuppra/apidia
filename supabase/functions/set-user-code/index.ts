import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetCodeBody {
  id: string;
  email: string;
  code: string;
}

function normalize(str: string) {
  return (str || "").trim();
}

function normalizeEmail(str: string) {
  return normalize(str).toLowerCase();
}

async function ensureUserExistsInSheet(sheetId: string, serviceAccountJson: string, id: string, email: string) {
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
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A:Z",
    majorDimension: "ROWS",
  });

  const rows = resp.data.values || [];
  if (rows.length === 0) return false;

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
      return true;
    }
  }
  return false;
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

    const body = (await req.json()) as SetCodeBody;
    const id = normalize(body?.id);
    const email = normalize(body?.email);
    const code = normalize(body?.code);

    if (!id || !email || !code) {
      return new Response(JSON.stringify({ error: "Missing id, email or code" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");
    if (!MAKE_WEBHOOK_URL) {
      throw new Error("Missing MAKE_WEBHOOK_URL secret");
    }

    // Optionnel: vérifier que l'utilisateur existe dans le Sheet
    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (SHEET_ID && SA_JSON) {
      const exists = await ensureUserExistsInSheet(SHEET_ID, SA_JSON, id, email);
      if (!exists) {
        return new Response(JSON.stringify({ error: "ID/email non trouvés" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Déclenche le scénario Make pour écrire le code dans la bonne cellule
    const resp = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, email, code }),
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
    console.error("set-user-code error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
