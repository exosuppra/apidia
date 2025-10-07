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

// Validation constants
const MAX_ID_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MIN_CODE_LENGTH = 8;
const MAX_CODE_LENGTH = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(str: string) {
  return (str || "").trim();
}

function normalizeEmail(str: string) {
  return normalize(str).toLowerCase();
}

function validateInput(id: string, email: string, code: string): string | null {
  if (!id || id.length === 0) return "ID manquant";
  if (id.length > MAX_ID_LENGTH) return `ID trop long (max ${MAX_ID_LENGTH} caractères)`;
  
  if (!email || email.length === 0) return "Email manquant";
  if (email.length > MAX_EMAIL_LENGTH) return `Email trop long (max ${MAX_EMAIL_LENGTH} caractères)`;
  if (!EMAIL_REGEX.test(email)) return "Format d'email invalide";
  
  if (!code || code.length === 0) return "Code manquant";
  if (code.length < MIN_CODE_LENGTH) return `Code trop court (min ${MIN_CODE_LENGTH} caractères)`;
  if (code.length > MAX_CODE_LENGTH) return `Code trop long (max ${MAX_CODE_LENGTH} caractères)`;
  
  return null;
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

    const bodyText = await req.text();
    
    let body: SetCodeBody;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const id = normalize(body?.id);
    const email = normalize(body?.email);
    const code = normalize(body?.code);

    // Validate input
    const validationError = validateInput(id, email, code);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");
    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");

    if (!MAKE_WEBHOOK_URL) {
      return new Response(JSON.stringify({ error: "Configuration manquante: MAKE_WEBHOOK_URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Vérification Google Sheet
    if (SHEET_ID && SA_JSON) {
      try {
        const exists = await ensureUserExistsInSheet(SHEET_ID, SA_JSON, id, email);
        if (!exists) {
          // Continue anyway but log the warning
          console.warn("User not found in sheet but continuing");
        }
      } catch (sheetError: any) {
        console.warn("Sheet verification failed but continuing:", sheetError?.message);
      }
    }

    // Appel du webhook Make
    const makePayload = { id, email, code };

    const resp = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makePayload),
    });
    
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ 
        error: "Erreur webhook Make",
        status: resp.status,
        details: text
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Code enregistré avec succès" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("set-user-code error:", err?.message || err);
    return new Response(JSON.stringify({ 
      error: "Erreur interne du serveur"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
