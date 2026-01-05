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
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
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

  // Exchange JWT for access token
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
  // Handle CORS preflight
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Google credentials and Sheet ID
    const credentialsJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const sheetId = Deno.env.get("GOOGLE_SHEETS_BACKUP_ID") || Deno.env.get("GOOGLE_SHEETS_ID");

    if (!credentialsJson) {
      return new Response(
        JSON.stringify({ error: "Google credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: "Google Sheet ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);

    // Fetch unsynced fiches
    const { data: unsynced, error: fetchError } = await supabase
      .from("fiches_data")
      .select("*")
      .eq("synced_to_sheets", false);

    if (fetchError) {
      console.error("Error fetching unsynced fiches:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch unsynced fiches", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!unsynced || unsynced.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No fiches to sync", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${unsynced.length} fiches to sync`);

    // Get access token
    const accessToken = await getAccessToken(credentials);

    // Group by fiche_type
    const grouped: Record<string, typeof unsynced> = {};
    for (const fiche of unsynced) {
      if (!grouped[fiche.fiche_type]) {
        grouped[fiche.fiche_type] = [];
      }
      grouped[fiche.fiche_type].push(fiche);
    }

    const results = {
      synced: 0,
      errors: [] as { fiche_id: string; error: string }[],
    };

    // Process each type
    for (const [ficheType, fiches] of Object.entries(grouped)) {
      console.log(`Syncing ${fiches.length} fiches of type: ${ficheType}`);

      // Create sheet name (sanitize for Google Sheets)
      const sheetName = `BACKUP_${ficheType.replace(/[^a-zA-Z0-9_]/g, "_")}`;

      // Get all unique keys from data
      const allKeys = new Set<string>();
      for (const fiche of fiches) {
        if (fiche.data && typeof fiche.data === "object") {
          Object.keys(fiche.data).forEach((key) => allKeys.add(key));
        }
      }
      const headers = ["fiche_id", "synced_at", ...Array.from(allKeys).sort()];

      // Prepare rows
      const rows = fiches.map((fiche) => {
        const row = [fiche.fiche_id, new Date().toISOString()];
        for (const key of Array.from(allKeys).sort()) {
          const value = fiche.data?.[key];
          row.push(typeof value === "object" ? JSON.stringify(value) : String(value ?? ""));
        }
        return row;
      });

      try {
        // Check if sheet exists
        const metadataResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const metadata = await metadataResponse.json();
        const existingSheets = metadata.sheets?.map((s: { properties: { title: string } }) => s.properties.title) || [];

        // Create sheet if it doesn't exist
        if (!existingSheets.includes(sheetName)) {
          console.log(`Creating sheet: ${sheetName}`);
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: [{ addSheet: { properties: { title: sheetName } } }],
            }),
          });

          // Add headers
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=RAW`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ values: [headers] }),
            }
          );
        }

        // Append data
        const appendResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ values: rows }),
          }
        );

        if (!appendResponse.ok) {
          const errorText = await appendResponse.text();
          throw new Error(`Failed to append data: ${errorText}`);
        }

        // Mark as synced
        const ficheIds = fiches.map((f) => f.id);
        const { error: updateError } = await supabase
          .from("fiches_data")
          .update({ synced_to_sheets: true })
          .in("id", ficheIds);

        if (updateError) {
          console.error("Error marking fiches as synced:", updateError);
          for (const fiche of fiches) {
            results.errors.push({ fiche_id: fiche.fiche_id, error: updateError.message });
          }
        } else {
          results.synced += fiches.length;
          console.log(`Synced ${fiches.length} fiches to sheet: ${sheetName}`);
        }
      } catch (sheetError) {
        console.error(`Error syncing type ${ficheType}:`, sheetError);
        for (const fiche of fiches) {
          results.errors.push({ fiche_id: fiche.fiche_id, error: String(sheetError) });
        }
      }
    }

    console.log("Sync complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${results.synced} fiches to Google Sheets`,
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
