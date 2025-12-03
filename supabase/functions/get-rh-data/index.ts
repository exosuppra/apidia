import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RHEntry {
  date: string;
  projet: string;
  tache: string;
  titre: string;
  heures_recherche_ot: number;
  heures_recherche_maison: number;
  temps_travail: string;
  valorisation: number;
}

function parseNumber(value: string): number {
  if (!value || value.trim() === "") return 0;
  // Handle both comma and dot decimal separators
  const cleaned = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: string): string {
  if (!value || value.trim() === "") return "";
  // Return as-is, frontend will handle formatting
  return value.trim();
}

// Parse time range like "Du 20 juin 2025 à 11h30 au 20 juin 2025 à 14h30" and calculate hours
function parseTimeRangeToHours(value: string): number {
  if (!value || value.trim() === "") return 0;
  
  // Try to extract two times from the string
  // Pattern: look for times like "11h30", "14h00", "9h", etc.
  const timePattern = /(\d{1,2})h(\d{2})?/gi;
  const matches = [...value.matchAll(timePattern)];
  
  if (matches.length >= 2) {
    // Extract start and end times
    const startHour = parseInt(matches[0][1], 10);
    const startMin = matches[0][2] ? parseInt(matches[0][2], 10) : 0;
    const endHour = parseInt(matches[1][1], 10);
    const endMin = matches[1][2] ? parseInt(matches[1][2], 10) : 0;
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let diffMinutes = endMinutes - startMinutes;
    // Handle overnight work (e.g., 22h to 6h)
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    
    const hours = diffMinutes / 60;
    console.log(`Parsed time range "${value}" -> ${startHour}h${startMin} to ${endHour}h${endMin} = ${hours.toFixed(2)}h`);
    return Math.round(hours * 100) / 100; // Round to 2 decimals
  }
  
  // If no time range found, try to parse as a simple number
  return parseNumber(value);
}

// Check if a cell contains a time range (has "Du" and "au" or time patterns)
function hasTimeRange(value: string): boolean {
  if (!value || value.trim() === "") return false;
  const lower = value.toLowerCase();
  return (lower.includes("du") && lower.includes("au")) || /\d{1,2}h\d{0,2}/i.test(value);
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

    // Use the dedicated RH Google Sheet
    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_RH_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_RH_ID secret");
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
    
    // Try multiple sheet names to find the RH data
    const possibleSheetNames = ["Feuille 2", "Feuille2", "Sheet2", "Sheet 2", "Feuille 1", "Feuille1", "Sheet1", "Sheet 1"];
    let sheetName = "";
    let sheetRange = "";
    
    // Try to find a valid sheet
    let rows: string[][] = [];
    
    for (const name of possibleSheetNames) {
      try {
        sheetName = name;
        sheetRange = `${name}!A1:ZZ1000`;
        console.log(`Trying to read RH data from sheet: ${sheetRange}`);
        
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: sheetRange,
          majorDimension: "ROWS",
        });
        
        rows = resp.data.values || [];
        if (rows.length > 0) {
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
      return new Response(JSON.stringify({ data: [], message: "Aucune donnée trouvée. Vérifiez le nom de l'onglet." }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const headerRaw: string[] = rows[0].map((h: string) => h?.toString() ?? "");
    const header = headerRaw.map((h: string) => h.trim());
    const headerLower = header.map((h: string) => h.toLowerCase());
    
    console.log("RH Sheet headers found:", header);

    // Map expected columns (case-insensitive search)
    const findColumn = (names: string[]): number => {
      return headerLower.findIndex((h) => 
        names.some(name => h.includes(name.toLowerCase()))
      );
    };

    const dateIdx = findColumn(["date"]);
    const projetIdx = findColumn(["projet"]);
    const tacheIdx = findColumn(["tâche", "tache"]);
    const titreIdx = findColumn(["titre"]);
    const heuresOTIdx = findColumn(["heure de recherche ot", "recherche ot"]);
    const heuresMaisonIdx = findColumn(["heure de recherche maison", "recherche maison"]);
    const tempsTravailIdx = findColumn(["temps de travail"]);
    const valorisationIdx = findColumn(["valorisation"]);

    console.log("Column indices:", {
      dateIdx, projetIdx, tacheIdx, titreIdx, 
      heuresOTIdx, heuresMaisonIdx, tempsTravailIdx, valorisationIdx
    });

    const data: RHEntry[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      const date = dateIdx >= 0 ? parseDate(row[dateIdx] || "") : "";
      const projet = projetIdx >= 0 ? (row[projetIdx] || "").trim() : "";
      const valorisation = valorisationIdx >= 0 ? parseNumber(row[valorisationIdx] || "") : 0;
      
      // Parse OT and Maison time ranges
      const otValue = heuresOTIdx >= 0 ? (row[heuresOTIdx] || "") : "";
      const maisonValue = heuresMaisonIdx >= 0 ? (row[heuresMaisonIdx] || "") : "";
      
      // Calculate hours from time ranges
      const heuresOT = parseTimeRangeToHours(otValue);
      const heuresMaison = parseTimeRangeToHours(maisonValue);
      
      // Skip rows without meaningful data
      if (!date && !projet && valorisation === 0 && heuresOT === 0 && heuresMaison === 0) continue;
      
      data.push({
        date,
        projet,
        tache: tacheIdx >= 0 ? (row[tacheIdx] || "").trim() : "",
        titre: titreIdx >= 0 ? (row[titreIdx] || "").trim() : "",
        heures_recherche_ot: heuresOT,
        heures_recherche_maison: heuresMaison,
        temps_travail: tempsTravailIdx >= 0 ? (row[tempsTravailIdx] || "").trim() : "",
        valorisation,
      });
    }

    console.log(`Processed ${data.length} RH entries`);
    
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("get-rh-data error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
