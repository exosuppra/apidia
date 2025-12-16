import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstablishmentData {
  name: string;
  data: Array<{
    date: string;
    reviews: number;
    rating: number;
  }>;
}

interface StatsResponse {
  establishments: EstablishmentData[];
  message?: string;
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

    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_EREPUTATION_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_EREPUTATION_ID secret");
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
    
    if (allSheetNames.length === 0) {
      console.log("No sheets found");
      return new Response(JSON.stringify({ 
        establishments: [],
        message: "Aucun onglet trouvé." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Fetch data from all sheets
    const establishments: EstablishmentData[] = [];
    
    for (const sheetName of allSheetNames) {
      try {
        const sheetRange = `'${sheetName}'!A1:D1000`;
        console.log(`Reading data from: ${sheetRange}`);
        
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
          valueRenderOption: "FORMATTED_VALUE",
        });
        
        const rows: string[][] = resp.data.values || [];
        console.log(`Found ${rows.length} rows in sheet "${sheetName}"`);
        
        if (rows.length <= 1) {
          console.log(`No data in sheet "${sheetName}", skipping`);
          continue;
        }

        // Log raw first row for debugging
        console.log(`Raw first row in "${sheetName}":`, JSON.stringify(rows[0]));

        // Extract headers
        const headers = rows[0].map(h => h?.toString().trim().toLowerCase() || "");
        console.log(`Headers found in "${sheetName}":`, headers);
        
        // Find column indices
        const dateIdx = headers.findIndex(h => h.includes("date"));
        const reviewsIdx = headers.findIndex(h => h.includes("avis"));
        const ratingIdx = headers.findIndex(h => h.includes("note"));
        
        console.log(`Column indices - date: ${dateIdx}, reviews: ${reviewsIdx}, rating: ${ratingIdx}`);
        
        // Extract data rows
        const data: Array<{ date: string; reviews: number; rating: number }> = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as string[];
          if (!row || row.length === 0) continue;
          
          // Get values
          const date = dateIdx >= 0 ? row[dateIdx]?.toString().trim() || "" : "";
          const reviewsStr = reviewsIdx >= 0 ? row[reviewsIdx]?.toString().trim() || "" : "";
          const ratingStr = ratingIdx >= 0 ? row[ratingIdx]?.toString().trim() || "" : "";
          
          // Parse numbers
          const reviews = parseFloat(reviewsStr.replace(",", ".")) || 0;
          const rating = parseFloat(ratingStr.replace(",", ".")) || 0;
          
          // Only add if we have at least some data
          if (date || reviews > 0 || rating > 0) {
            data.push({ date, reviews, rating });
          }
        }
        
        console.log(`Processed ${data.length} data rows for establishment "${sheetName}"`);
        
        if (data.length > 0) {
          establishments.push({
            name: sheetName,
            data
          });
        }
        
      } catch (sheetError: any) {
        console.error(`Error reading sheet "${sheetName}":`, sheetError?.message);
        continue;
      }
    }

    console.log(`Total establishments processed: ${establishments.length}`);
    
    return new Response(JSON.stringify({ establishments }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("get-stats-ereputation error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
