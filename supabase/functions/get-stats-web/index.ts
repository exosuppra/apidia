import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_STATS_WEB_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_STATS_WEB_ID secret");
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
    
    // Try multiple sheet names to find the data
    const possibleSheetNames = ["Feuille 1", "Feuille1", "Sheet1", "Sheet 1", "Feuille 2", "Feuille2"];
    let rows: string[][] = [];
    let foundSheetName = "";
    
    for (const name of possibleSheetNames) {
      try {
        const sheetRange = `${name}!A1:ZZ1000`;
        console.log(`Trying to read stats web data from sheet: ${sheetRange}`);
        
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
        });
        
        rows = resp.data.values || [];
        if (rows.length > 0) {
          foundSheetName = name;
          console.log(`SUCCESS: Found sheet "${name}" with ${rows.length} rows`);
          break;
        }
      } catch (sheetError: any) {
        console.log(`Sheet "${name}" not found, trying next...`);
        continue;
      }
    }
    
    if (rows.length === 0) {
      console.log("No data found in any sheet");
      return new Response(JSON.stringify({ 
        data: [], 
        headers: [],
        sheetName: "",
        message: "Aucune donnée trouvée. Vérifiez le nom de l'onglet." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract headers
    const headers: string[] = rows[0].map((h: string) => h?.toString().trim() ?? "");
    console.log("Stats Web headers found:", headers);

    // Extract data rows
    const data: Record<string, string>[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      if (!row || row.length === 0) continue;
      
      // Skip completely empty rows
      const hasData = row.some(cell => cell && cell.trim() !== "");
      if (!hasData) continue;
      
      const rowData: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rowData[header] = row[idx]?.toString().trim() || "";
      });
      
      data.push(rowData);
    }

    console.log(`Processed ${data.length} stats web entries`);
    
    return new Response(JSON.stringify({ 
      data, 
      headers,
      sheetName: foundSheetName 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("get-stats-web error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
