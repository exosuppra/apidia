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

    console.log("Using Sheet ID:", SHEET_ID);

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
    
    // First, get the spreadsheet metadata to find actual sheet names
    console.log("Fetching spreadsheet metadata...");
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    
    const sheetNames = spreadsheetInfo.data.sheets?.map(s => s.properties?.title || "") || [];
    console.log("Available sheets in spreadsheet:", sheetNames);
    
    if (sheetNames.length === 0) {
      console.log("No sheets found in spreadsheet");
      return new Response(JSON.stringify({ 
        data: [], 
        headers: [],
        sheetName: "",
        message: "Aucun onglet trouvé dans le document." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Use the first sheet by default
    const sheetName = sheetNames[0];
    console.log(`Using first sheet: "${sheetName}"`);
    
    const sheetRange = `${sheetName}!A1:ZZ1000`;
    console.log(`Reading data from range: ${sheetRange}`);
    
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: sheetRange,
      majorDimension: "ROWS",
    });
    
    const rows: string[][] = resp.data.values || [];
    console.log(`Found ${rows.length} rows in sheet "${sheetName}"`);
    
    if (rows.length === 0) {
      console.log("No data found in sheet");
      return new Response(JSON.stringify({ 
        data: [], 
        headers: [],
        sheetName: sheetName,
        message: "Aucune donnée trouvée dans l'onglet." 
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
      sheetName: sheetName 
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
