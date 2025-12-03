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
    
    // Read specifically from "Feuille 2"
    const sheetName = "Feuille 2";
    const sheetRange = `${sheetName}!A1:ZZ1000`;
    
    console.log(`Reading RH data from sheet: ${sheetRange}`);
    
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: sheetRange,
      majorDimension: "ROWS",
    });
    
    const rows = resp.data.values || [];
    
    if (rows.length === 0) {
      console.log("No data found in Feuille 2");
      return new Response(JSON.stringify({ data: [] }), {
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
      
      // Skip rows without meaningful data
      if (!date && !projet && valorisation === 0) continue;
      
      data.push({
        date,
        projet,
        tache: tacheIdx >= 0 ? (row[tacheIdx] || "").trim() : "",
        titre: titreIdx >= 0 ? (row[titreIdx] || "").trim() : "",
        heures_recherche_ot: heuresOTIdx >= 0 ? parseNumber(row[heuresOTIdx] || "") : 0,
        heures_recherche_maison: heuresMaisonIdx >= 0 ? parseNumber(row[heuresMaisonIdx] || "") : 0,
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
