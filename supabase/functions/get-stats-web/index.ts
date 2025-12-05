import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SiteData {
  name: string;
  data: Record<string, string>[];
  headers: string[];
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
    
    // Get spreadsheet metadata to find all sheet names
    console.log("Fetching spreadsheet metadata...");
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    
    const allSheetNames = spreadsheetInfo.data.sheets?.map(s => s.properties?.title || "") || [];
    console.log("Available sheets in spreadsheet:", allSheetNames);
    
    // Filter out "Global" sheet (case insensitive, with possible spaces)
    const excludedNames = ["global", "globals", "globale"];
    const sheetNames = allSheetNames.filter(name => 
      !excludedNames.includes(name.toLowerCase().trim())
    );
    
    console.log("Sheets to process (excluding Global):", sheetNames);
    
    if (sheetNames.length === 0) {
      console.log("No sheets found after filtering");
      return new Response(JSON.stringify({ 
        sites: [],
        message: "Aucun onglet trouvé (hors Global)." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Fetch data from all sheets
    const sites: SiteData[] = [];
    
    for (const sheetName of sheetNames) {
      try {
        const sheetRange = `'${sheetName}'!A1:ZZ1000`;
        console.log(`Reading data from: ${sheetRange}`);
        
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
        });
        
        const rows: string[][] = resp.data.values || [];
        console.log(`Found ${rows.length} rows in sheet "${sheetName}"`);
        
        if (rows.length === 0) {
          console.log(`No data in sheet "${sheetName}", skipping`);
          continue;
        }

        // Extract headers
        const allHeaders: string[] = rows[0].map((h: string) => h?.toString().trim() ?? "");
        
        // Define columns to keep (in order)
        const columnsToKeep = [
          "Periode",
          "Total Nbr Utilisateur",
          "Moyenne durée",
          "Nbr total de pages vues",
          "Tx d'engagement moyen"
        ];
        
        // Find indices of columns to keep
        const columnIndices: { header: string; index: number }[] = [];
        columnsToKeep.forEach(col => {
          const idx = allHeaders.findIndex(h => h.toLowerCase() === col.toLowerCase());
          if (idx !== -1) {
            columnIndices.push({ header: allHeaders[idx], index: idx });
          }
        });
        
        // Filter headers to only kept columns
        const headers = columnIndices.map(c => c.header);
        
        console.log(`Columns found in "${sheetName}":`, headers);
        
        // Extract data rows with only the relevant columns
        const data: Record<string, string>[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as string[];
          if (!row || row.length === 0) continue;
          
          // Skip completely empty rows
          const hasData = row.some(cell => cell && cell.trim() !== "");
          if (!hasData) continue;
          
          const rowData: Record<string, string> = {};
          columnIndices.forEach(({ header, index }) => {
            rowData[header] = row[index]?.toString().trim() || "";
          });
          
          // Only add if has at least one value
          const hasValues = Object.values(rowData).some(v => v !== "");
          if (hasValues) {
            data.push(rowData);
          }
        }
        
        if (data.length > 0) {
          sites.push({
            name: sheetName,
            data,
            headers
          });
          console.log(`Processed ${data.length} rows for site "${sheetName}"`);
        }
      } catch (sheetError: any) {
        console.error(`Error reading sheet "${sheetName}":`, sheetError?.message);
        continue;
      }
    }

    console.log(`Total sites processed: ${sites.length}`);
    
    return new Response(JSON.stringify({ sites }), {
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
