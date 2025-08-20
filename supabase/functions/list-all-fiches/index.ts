import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(str: string) {
  return (str || "").trim();
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
    
    // Récupérer la liste de toutes les feuilles
    console.log("Getting spreadsheet metadata...");
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    const allSheets = spreadsheet.data.sheets || [];
    console.log(`Found ${allSheets.length} sheets in total`);

    // Filtrer les feuilles qui ne contiennent pas "SOURCING"
    const validSheets = allSheets.filter(sheet => {
      const sheetName = sheet.properties?.title || "";
      const containsSourcing = sheetName.toUpperCase().includes("SOURCING");
      console.log(`Sheet "${sheetName}": ${containsSourcing ? "EXCLUDED (contains SOURCING)" : "INCLUDED"}`);
      return !containsSourcing;
    });

    const allRows: Array<{ sheetName: string; data: Record<string, string> }> = [];
    
    console.log(`Processing ${validSheets.length} valid sheets...`);
    
    for (const sheet of validSheets) {
      const sheetName = sheet.properties?.title || "";
      try {
        const sheetRange = `${sheetName}!A1:ZZ1000`;
        console.log(`Reading sheet: ${sheetRange}`);
        
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
        });
        
        const sheetRows = resp.data.values || [];
        if (sheetRows.length > 1) { // Au moins header + 1 ligne de données
          console.log(`SUCCESS: Found sheet "${sheetName}" with ${sheetRows.length} rows`);
          
          const headerRaw: string[] = sheetRows[0].map((h: string) => h?.toString() ?? "");
          const header = headerRaw.map((h: string) => h.trim());
          const headerLower = header.map((h: string) => h.toLowerCase());
          
          // Traiter chaque ligne de données
          for (let i = 1; i < sheetRows.length; i++) {
            const row = sheetRows[i] as string[];
            const obj: Record<string, string> = {};
            
            // Ajouter le nom de la feuille comme première colonne
            obj["feuille"] = sheetName;
            
            // Ajouter toutes les colonnes
            for (let c = 0; c < header.length && c < row.length; c++) {
              const key = headerLower[c] || `col_${c}`;
              obj[key] = (row[c] ?? "").toString();
            }
            
            // Ne garder que les lignes qui ont au moins une donnée non vide
            const hasData = Object.values(obj).some(value => value && value.trim() !== "");
            if (hasData) {
              allRows.push({ sheetName, data: obj });
            }
          }
        }
      } catch (sheetError: any) {
        console.log(`Failed to read sheet "${sheetName}": ${sheetError.message}`);
        continue;
      }
    }
    
    console.log(`Total rows found: ${allRows.length}`);
    
    return new Response(JSON.stringify({ data: allRows }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("list-all-fiches error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});