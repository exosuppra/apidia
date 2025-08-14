import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminListAllFichesBody {
  adminEmail: string;
  sheetName?: string;
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

    const body = (await req.json()) as AdminListAllFichesBody;
    const adminEmail = normalizeEmail(body?.adminEmail);
    const sheetName = body?.sheetName;

    if (!adminEmail) {
      return new Response(JSON.stringify({ error: "Missing admin email" }), {
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

    // Récupérer la liste des feuilles si aucune n'est spécifiée
    if (!sheetName) {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
      });
      
      const sheetNames = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title).filter(Boolean) || [];
      
      return new Response(JSON.stringify({ 
        sheets: sheetNames,
        total: sheetNames.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Récupérer les données d'une feuille spécifique
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:Z`,
      majorDimension: "ROWS",
    });

    const rows = resp.data.values || [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ 
        data: [], 
        sheet: sheetName,
        total: 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const headerRaw: string[] = rows[0].map((h: string) => h?.toString() ?? "");
    const header = headerRaw.map((h: string) => h.trim());
    const headerLower = header.map((h: string) => h.toLowerCase());

    const allData = [] as Record<string, any>[];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const obj: Record<string, any> = { 
        _rowIndex: i + 1,
        _sheet: sheetName
      };
      for (let c = 0; c < header.length; c++) {
        const key = headerLower[c] || `col_${c}`;
        obj[key] = (row[c] ?? "").toString();
      }
      allData.push(obj);
    }

    // Log admin action
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("admin_actions").insert({
      admin_email: adminEmail,
      action_type: "view",
      target_type: "sheet",
      target_id: sheetName,
      description: `Admin ${adminEmail} listed all fiches from sheet ${sheetName}`,
      metadata: { sheet: sheetName, total: allData.length }
    });

    console.log(`Admin ${adminEmail} accessed sheet ${sheetName} with ${allData.length} records`);

    return new Response(JSON.stringify({ 
      data: allData,
      sheet: sheetName,
      headers: header,
      total: allData.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("admin-list-all-fiches error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});