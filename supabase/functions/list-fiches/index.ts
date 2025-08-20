import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ListFichesBody {
  email: string;
}

function normalize(str: string) {
  return (str || "").trim();
}

function normalizeEmail(str: string) {
  return normalize(str).toLowerCase();
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

    const body = (await req.json()) as ListFichesBody;
    const email = normalizeEmail(body?.email);

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_ID secret");
    if (!SA_JSON) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON secret");

    const sa = JSON.parse(SA_JSON || "{}");
    if (!sa.client_email || !sa.private_key) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON secret: missing client_email/private_key");
    }

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: (sa.private_key as string).replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    // Essayer plusieurs noms de feuilles possibles
    const possibleSheets = ["BD COS", "BD_COS", "BDCOS", "Feuil1"];
    let resp;
    let sheetUsed = "";
    
    console.log(`Looking for email: ${email}`);
    console.log("Trying different sheet names...");
    
    for (const sheetName of possibleSheets) {
      try {
        const sheetRange = `${sheetName}!A:Z`;
        console.log(`Trying sheet: ${sheetRange}`);
        
        resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
        });
        
        sheetUsed = sheetName;
        console.log(`SUCCESS: Found sheet "${sheetName}" with ${resp.data.values?.length || 0} rows`);
        break;
      } catch (sheetError: any) {
        console.log(`Failed to read sheet "${sheetName}": ${sheetError.message}`);
        continue;
      }
    }
    
    if (!resp) {
      throw new Error(`Could not find any readable sheet. Tried: ${possibleSheets.join(", ")}`);
    }

    const rows = resp.data.values || [];
    console.log(`Found ${rows.length} rows in sheet`);
    
    if (rows.length === 0) {
      console.log("No data found in sheet");
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const headerRaw: string[] = rows[0].map((h: string) => h?.toString() ?? "");
    const header = headerRaw.map((h: string) => h.trim());
    const headerLower = header.map((h: string) => h.toLowerCase());
    
    console.log("Sheet headers found:", header);
    console.log("Headers (lowercase):", headerLower);

    const emailIdx = headerLower.findIndex((h) => ["email", "e-mail", "mail"].includes(h));
    console.log(`Email column index: ${emailIdx}`);
    
    if (emailIdx === -1) {
      console.log("ERROR: No email column found in headers:", headerLower);
      throw new Error("Sheet headers must include 'email'");
    }

    const filtered = [] as Record<string, string>[];
    console.log("Searching through rows...");
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const rawRowEmail = row[emailIdx] ?? "";
      const rowEmail = normalizeEmail(rawRowEmail);
      
      if (i <= 5) { // Log first 5 rows for debugging
        console.log(`Row ${i}: raw email="${rawRowEmail}", normalized="${rowEmail}"`);
      }
      
      if (rowEmail && rowEmail === email) {
        console.log(`MATCH FOUND at row ${i}: "${rowEmail}"`);
        const obj: Record<string, string> = {};
        for (let c = 0; c < header.length; c++) {
          const key = headerLower[c] || `col_${c}`;
          obj[key] = (row[c] ?? "").toString();
        }
        filtered.push(obj);
      }
    }

    console.log(`Total matches found: ${filtered.length}`);
    return new Response(JSON.stringify({ data: filtered }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("list-fiches error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
