import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyBody {
  id: string;
  email: string;
  code: string;
}

// Validation constants
const MAX_ID_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
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
  if (code.length > MAX_CODE_LENGTH) return `Code trop long (max ${MAX_CODE_LENGTH} caractères)`;
  
  return null;
}

async function findUserWithCode(sheetId: string, serviceAccountJson: string, id: string, email: string, code: string) {
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
    range: "ENT LOGIN!A:Z",
    majorDimension: "ROWS",
  });

  const rows = resp.data.values || [];
  if (rows.length === 0) return null;

  const header = rows[0].map((h: string) => h.toString().trim().toLowerCase());
  const idIdx = header.findIndex((h: string) => ["id", "user_id", "identifiant"].includes(h));
  const emailIdx = header.findIndex((h: string) => ["email", "e-mail", "mail"].includes(h));
  const codeIdx = header.findIndex((h: string) => ["code", "password", "motdepasse"].includes(h));

  if (idIdx === -1 || emailIdx === -1 || codeIdx === -1) {
    throw new Error("Sheet headers must include 'id', 'email' and 'code' (case-insensitive)");
  }

  const wantedId = normalize(id);
  const wantedEmail = normalizeEmail(email);
  const wantedCode = normalize(code);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowId = normalize(row[idIdx] ?? "");
    const rowEmail = normalizeEmail(row[emailIdx] ?? "");
    const rowCode = normalize(row[codeIdx] ?? "");
    if (rowId && rowEmail && rowCode && rowId === wantedId && rowEmail === wantedEmail && rowCode === wantedCode) {
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

    const body = (await req.json()) as VerifyBody;
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

    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_ID secret");
    if (!SA_JSON) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON secret");

    const match = await findUserWithCode(SHEET_ID, SA_JSON, id, email, code);
    if (!match) {
      return new Response(JSON.stringify({ error: "Identifiants invalides" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, email: match.email }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("verify-login error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
