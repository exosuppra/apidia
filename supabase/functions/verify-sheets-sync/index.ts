import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContents = credentials.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const credentialsJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const sheetId = Deno.env.get("GOOGLE_SHEETS_BACKUP_ID") || Deno.env.get("GOOGLE_SHEETS_ID");

    if (!credentialsJson || !sheetId) {
      return new Response(
        JSON.stringify({ error: "Google credentials or Sheet ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);

    // Get all synced fiches from fiches_data
    const { data: syncedFichesData, error: fetchDataError } = await supabase
      .from("fiches_data")
      .select("id, fiche_id, fiche_type")
      .eq("synced_to_sheets", true);

    if (fetchDataError) {
      console.error("Error fetching synced fiches from fiches_data:", fetchDataError);
    }

    // Get all synced fiches from fiches_verified
    const { data: syncedFichesVerified, error: fetchVerifiedError } = await supabase
      .from("fiches_verified")
      .select("id, fiche_id, fiche_type")
      .eq("synced_to_sheets", true);

    if (fetchVerifiedError) {
      console.error("Error fetching synced fiches from fiches_verified:", fetchVerifiedError);
    }

    // Combine both sources
    const syncedFiches = [
      ...(syncedFichesData || []).map(f => ({ ...f, _source: 'fiches_data' as const })),
      ...(syncedFichesVerified || []).map(f => ({ ...f, _source: 'fiches_verified' as const })),
    ];

    if (syncedFiches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No synced fiches to verify", verified: 0, unmarked: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verifying ${syncedFiches.length} synced fiches against Google Sheets (${syncedFichesData?.length || 0} from fiches_data, ${syncedFichesVerified?.length || 0} from fiches_verified)`);

    // Get spreadsheet metadata to find all sheets
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const metadata = await metadataResponse.json();
    const sheetNames = metadata.sheets?.map((s: { properties: { title: string } }) => s.properties.title) || [];

    // Collect all fiche_ids from all BACKUP_ sheets
    const sheetFicheIds = new Set<string>();

    for (const sheetName of sheetNames) {
      if (!sheetName.startsWith("BACKUP_")) continue;

      console.log(`Reading fiche_ids from sheet: ${sheetName}`);

      // Get column A (fiche_id) from the sheet
      const dataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:A`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!dataResponse.ok) {
        console.error(`Failed to read sheet ${sheetName}:`, await dataResponse.text());
        continue;
      }

      const sheetData = await dataResponse.json();
      const rows = sheetData.values || [];

      // Skip header row, collect fiche_ids
      for (let i = 1; i < rows.length; i++) {
        const ficheId = rows[i]?.[0];
        if (ficheId) {
          sheetFicheIds.add(String(ficheId));
        }
      }
    }

    console.log(`Found ${sheetFicheIds.size} fiche_ids in Google Sheets`);

    // Find fiches that are marked as synced but missing from sheets
    const missingFiches = syncedFiches.filter(f => !sheetFicheIds.has(f.fiche_id));

    console.log(`Found ${missingFiches.length} fiches missing from sheets`);

    const results = {
      verified: syncedFiches.length,
      inSheets: sheetFicheIds.size,
      missing: missingFiches.length,
      unmarked: 0,
      errors: [] as { fiche_id: string; error: string }[],
    };

    // Mark missing fiches as not synced - separate updates for each source table
    if (missingFiches.length > 0) {
      const missingFromData = missingFiches.filter(f => f._source === 'fiches_data');
      const missingFromVerified = missingFiches.filter(f => f._source === 'fiches_verified');

      if (missingFromData.length > 0) {
        const dataIds = missingFromData.map(f => f.id);
        const { error: updateDataError } = await supabase
          .from("fiches_data")
          .update({ synced_to_sheets: false })
          .in("id", dataIds);

        if (updateDataError) {
          console.error("Error unmarking fiches_data:", updateDataError);
          results.errors.push({ fiche_id: "fiches_data_batch", error: updateDataError.message });
        } else {
          results.unmarked += missingFromData.length;
          console.log(`Unmarked ${missingFromData.length} fiches from fiches_data for re-sync`);
        }
      }

      if (missingFromVerified.length > 0) {
        const verifiedIds = missingFromVerified.map(f => f.id);
        const { error: updateVerifiedError } = await supabase
          .from("fiches_verified")
          .update({ synced_to_sheets: false })
          .in("id", verifiedIds);

        if (updateVerifiedError) {
          console.error("Error unmarking fiches_verified:", updateVerifiedError);
          results.errors.push({ fiche_id: "fiches_verified_batch", error: updateVerifiedError.message });
        } else {
          results.unmarked += missingFromVerified.length;
          console.log(`Unmarked ${missingFromVerified.length} fiches from fiches_verified for re-sync`);
        }
      }
    }

    console.log("Verification complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verified ${results.verified} fiches, ${results.unmarked} marked for re-sync`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
