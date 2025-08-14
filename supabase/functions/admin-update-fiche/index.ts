import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminUpdateFicheBody {
  adminEmail: string;
  sheetName: string;
  rowIndex: number;
  updates: Record<string, string>;
  originalData?: Record<string, string>;
}

function normalizeEmail(str: string) {
  return (str || "").trim().toLowerCase();
}

const ADMIN_EMAILS = [
  "admin@apidia.com",
  "direction@apidia.com",
  "it@apidia.com"
];

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

    const body = (await req.json()) as AdminUpdateFicheBody;
    const adminEmail = normalizeEmail(body?.adminEmail);
    const { sheetName, rowIndex, updates, originalData } = body;

    if (!adminEmail || !sheetName || !rowIndex || !updates) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Vérifier les droits admin
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SHEET_ID) throw new Error("Missing GOOGLE_SHEETS_ID secret");
    if (!SA_JSON) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON secret");

    const sa = JSON.parse(SA_JSON || "{}");
    if (!sa.client_email || !sa.private_key) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON secret");
    }

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: (sa.private_key as string).replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // D'abord, récupérer les en-têtes pour mapper les colonnes
    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!1:1`,
      majorDimension: "ROWS",
    });

    const headers = headerResp.data.values?.[0] || [];
    const headerLower = headers.map((h: string) => h.toLowerCase().trim());

    // Préparer les mises à jour par colonne
    const batchUpdateRequests = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const columnIndex = headerLower.indexOf(key.toLowerCase());
      if (columnIndex !== -1) {
        const columnLetter = String.fromCharCode(65 + columnIndex); // A, B, C, etc.
        const range = `${sheetName}!${columnLetter}${rowIndex}`;
        
        batchUpdateRequests.push({
          range,
          values: [[value]]
        });
      }
    }

    if (batchUpdateRequests.length === 0) {
      return new Response(JSON.stringify({ error: "No valid columns to update" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Effectuer les mises à jour
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: batchUpdateRequests
      }
    });

    // Log admin action
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("admin_actions").insert({
      admin_email: adminEmail,
      action_type: "update",
      target_type: "fiche",
      target_id: `${sheetName}_row_${rowIndex}`,
      description: `Admin ${adminEmail} updated fiche in ${sheetName} at row ${rowIndex}`,
      metadata: { 
        sheet: sheetName,
        rowIndex,
        updates,
        originalData,
        columnsUpdated: Object.keys(updates).length
      }
    });

    console.log(`Admin ${adminEmail} updated fiche in ${sheetName} row ${rowIndex}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Fiche updated successfully",
      sheet: sheetName,
      rowIndex,
      updatedColumns: Object.keys(updates).length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("admin-update-fiche error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});