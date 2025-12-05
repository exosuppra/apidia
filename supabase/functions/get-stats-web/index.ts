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
    const excludedNames = ["global", "globals", "globale", "global "];
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
        const sheetRange = `'${sheetName}'!A1:Z1000`;
        console.log(`Reading data from: ${sheetRange}`);
        
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
          valueRenderOption: "FORMATTED_VALUE",
        });
        
        const rows: string[][] = resp.data.values || [];
        console.log(`Found ${rows.length} rows in sheet "${sheetName}"`);
        
        if (rows.length === 0) {
          console.log(`No data in sheet "${sheetName}", skipping`);
          continue;
        }

        // Log raw first row for debugging
        console.log(`Raw first row in "${sheetName}":`, JSON.stringify(rows[0]));

        // Extract headers - filter out empty headers
        const rawHeaders: string[] = rows[0] || [];
        const headers: string[] = rawHeaders
          .map((h: string) => (h?.toString().trim() ?? ""))
          .filter((h: string) => h !== "");
        
        console.log(`Headers found in "${sheetName}":`, headers);
        
        if (headers.length === 0) {
          console.log(`No valid headers in sheet "${sheetName}", skipping`);
          continue;
        }
        
        // Extract data rows
        const data: Record<string, string>[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as string[];
          if (!row || row.length === 0) continue;
          
          // Skip completely empty rows
          const hasData = row.some(cell => cell && cell.toString().trim() !== "");
          if (!hasData) continue;
          
          const rowData: Record<string, string> = {};
          
          // Map data to headers (only for valid headers)
          rawHeaders.forEach((rawHeader, idx) => {
            const header = rawHeader?.toString().trim() || "";
            if (header !== "" && row[idx] !== undefined) {
              rowData[header] = row[idx]?.toString().trim() || "";
            }
          });
          
          // Only add row if it has at least one non-empty value
          const hasValues = Object.values(rowData).some(v => v !== "");
          if (hasValues) {
            data.push(rowData);
          }
        }
        
        console.log(`Processed ${data.length} data rows for site "${sheetName}"`);
        
        // Add site even if it has headers but no data rows (for debugging)
        sites.push({
          name: sheetName,
          data,
          headers
        });
        
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
