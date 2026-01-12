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

    // Helper to extract nested values safely
    const extractValue = (obj: Record<string, unknown>, path: string): string => {
      const keys = path.split('.');
      let result: unknown = obj;
      for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
          result = (result as Record<string, unknown>)[key];
        } else {
          return '';
        }
      }
      if (result === null || result === undefined) return '';
      if (typeof result === 'object') return JSON.stringify(result);
      return String(result);
    };

    // Extract contact info
    const extractContact = (data: Record<string, unknown>, contactType: string): string => {
      const moyens = (data.informations as Record<string, unknown>)?.moyensCommunication as Array<Record<string, unknown>> | undefined;
      if (!moyens) return '';
      const moyen = moyens.find(m => {
        const type = (m.type as Record<string, unknown>)?.libelleFr;
        return type === contactType;
      });
      if (!moyen) return '';
      const coordonnees = moyen.coordonnees as Record<string, string> | string;
      return typeof coordonnees === 'object' ? coordonnees.fr || '' : coordonnees || '';
    };

    // Process each type
    for (const [ficheType, fiches] of Object.entries(grouped)) {
      console.log(`Syncing ${fiches.length} fiches of type: ${ficheType}`);

      // Create sheet name (sanitize for Google Sheets)
      const sheetName = `BACKUP_${ficheType.replace(/[^a-zA-Z0-9_]/g, "_")}`;

      // Define comprehensive headers for APIDAE data
      const headers = [
        "fiche_id",
        "synced_at",
        "nom",
        "state",
        "identifier",
        // Localisation
        "adresse1",
        "adresse2",
        "code_postal",
        "commune",
        "pays",
        "latitude",
        "longitude",
        "altitude",
        // Contact
        "telephone",
        "telephone2",
        "fax",
        "email",
        "email2",
        "site_web",
        "facebook",
        "instagram",
        "twitter",
        // Présentation
        "description_courte",
        "description_detaillee",
        // Ouverture
        "periode_ouverture",
        "complement_ouverture",
        // Tarifs
        "tarifs_en_clair",
        "modes_paiement",
        // Capacités
        "capacite_totale",
        "nombre_chambres",
        "nombre_emplacements",
        // Classement
        "classement",
        "labels",
        // Gestion
        "date_creation",
        "date_modification",
        "proprietaire",
        "email_signalement",
        // Métadonnées
        "categories",
        "themes",
        "activites",
        "equipements",
        "services",
        "langues_parlees",
        "animaux_acceptes",
        // Médias stockés
        "media_url_1",
        "media_url_2",
        "media_url_3",
        "media_url_4",
        "media_url_5",
        "media_legende_1",
        "media_legende_2",
        "media_legende_3",
        "media_legende_4",
        "media_legende_5",
        // Données complètes JSON
        "data_json_complet"
      ];

      // Helper to extract array of labels
      const extractLabels = (data: Record<string, unknown>, path: string): string => {
        const keys = path.split('.');
        let result: unknown = data;
        for (const key of keys) {
          if (result && typeof result === 'object' && key in result) {
            result = (result as Record<string, unknown>)[key];
          } else {
            return '';
          }
        }
        if (!Array.isArray(result)) return '';
        return result.map((item: Record<string, unknown>) => {
          if (item.libelleFr) return item.libelleFr;
          if (item.nom) return item.nom;
          return '';
        }).filter(Boolean).join(', ');
      };

      // Extract all contacts of a type
      const extractAllContacts = (data: Record<string, unknown>, contactType: string): string => {
        const moyens = (data.informations as Record<string, unknown>)?.moyensCommunication as Array<Record<string, unknown>> | undefined;
        if (!moyens) return '';
        const matches = moyens.filter(m => {
          const type = (m.type as Record<string, unknown>)?.libelleFr;
          return type === contactType;
        });
        return matches.map(m => {
          const coordonnees = m.coordonnees as Record<string, string> | string;
          return typeof coordonnees === 'object' ? coordonnees.fr || '' : coordonnees || '';
        }).filter(Boolean).join(', ');
      };

      // Extract payment modes
      const extractPaymentModes = (data: Record<string, unknown>): string => {
        const tarifs = data.descriptionTarif as Record<string, unknown> | undefined;
        if (!tarifs) return '';
        const modes = tarifs.modesPaiement as Array<Record<string, unknown>> | undefined;
        if (!modes) return '';
        return modes.map(m => m.libelleFr || '').filter(Boolean).join(', ');
      };

      // Helper to extract stored media
      const extractStoredMedia = (data: Record<string, unknown>): Array<{ url: string; legende: string }> => {
        const storedMedia = data._stored_media as Array<{ stored_url: string; legende?: string }> | undefined;
        if (!storedMedia || !Array.isArray(storedMedia)) return [];
        return storedMedia.map(m => ({
          url: m.stored_url || '',
          legende: m.legende || ''
        }));
      };

      // Prepare rows with comprehensive data
      const rows = fiches.map((fiche) => {
        const data = fiche.data as Record<string, unknown> || {};
        const coords = extractValue(data, 'localisation.geolocalisation.geoJson.coordinates');
        let lat = '', lng = '';
        if (coords) {
          try {
            const parsed = JSON.parse(coords);
            if (Array.isArray(parsed) && parsed.length >= 2) {
              lng = String(parsed[0]);
              lat = String(parsed[1]);
            }
          } catch { /* ignore */ }
        }

        // Truncate JSON to avoid Google Sheets cell limit (50000 chars)
        let fullJson = '';
        try {
          const jsonStr = JSON.stringify(data);
          fullJson = jsonStr.length > 45000 ? jsonStr.substring(0, 45000) + '...[TRUNCATED]' : jsonStr;
        } catch { fullJson = ''; }

        // Get stored media URLs
        const storedMedia = extractStoredMedia(data);

        return [
          fiche.fiche_id,
          new Date().toISOString(),
          extractValue(data, 'nom.libelleFr'),
          extractValue(data, 'state'),
          extractValue(data, 'identifier'),
          // Localisation
          extractValue(data, 'localisation.adresse.adresse1'),
          extractValue(data, 'localisation.adresse.adresse2'),
          extractValue(data, 'localisation.adresse.codePostal'),
          extractValue(data, 'localisation.adresse.commune.nom'),
          extractValue(data, 'localisation.adresse.commune.pays.libelleFr'),
          lat,
          lng,
          extractValue(data, 'localisation.geolocalisation.altitude'),
          // Contact
          extractAllContacts(data, 'Téléphone'),
          extractAllContacts(data, 'Téléphone / Fax'),
          extractAllContacts(data, 'Fax'),
          extractAllContacts(data, 'Mél'),
          extractAllContacts(data, 'Mél secondaire'),
          extractAllContacts(data, 'Site web (URL)'),
          extractAllContacts(data, 'Page facebook'),
          extractAllContacts(data, 'Instagram'),
          extractAllContacts(data, 'Twitter'),
          // Présentation
          extractValue(data, 'presentation.descriptifCourt.libelleFr'),
          extractValue(data, 'presentation.descriptifDetaille.libelleFr'),
          // Ouverture
          extractValue(data, 'ouverture.periodeEnClair.libelleFr'),
          extractValue(data, 'ouverture.complementHoraire.libelleFr'),
          // Tarifs
          extractValue(data, 'descriptionTarif.tarifsEnClair.libelleFr'),
          extractPaymentModes(data),
          // Capacités
          extractValue(data, 'capacite.capaciteTotale'),
          extractValue(data, 'capacite.nombreChambres'),
          extractValue(data, 'capacite.nombreEmplacements'),
          // Classement
          extractValue(data, 'informationsHebergementCollectif.classement.libelleFr') || 
            extractValue(data, 'informationsHotellerie.classement.libelleFr'),
          extractLabels(data, 'labels'),
          // Gestion
          extractValue(data, 'gestion.dateCreation'),
          extractValue(data, 'gestion.dateModification'),
          extractValue(data, 'gestion.membreProprietaire.nom'),
          extractValue(data, 'gestion.signalerUnProblemeMails'),
          // Métadonnées
          extractLabels(data, 'informations.typesClientele'),
          extractLabels(data, 'presentation.typologiesPromoSitra'),
          extractLabels(data, 'prestations.activites'),
          extractLabels(data, 'prestations.equipements'),
          extractLabels(data, 'prestations.services'),
          extractLabels(data, 'prestations.languesParlees'),
          extractValue(data, 'prestations.animauxAcceptes') === 'ACCEPTES' ? 'Oui' : 
            (extractValue(data, 'prestations.animauxAcceptes') === 'NON_ACCEPTES' ? 'Non' : ''),
          // Médias stockés (5 premiers)
          storedMedia[0]?.url || '',
          storedMedia[1]?.url || '',
          storedMedia[2]?.url || '',
          storedMedia[3]?.url || '',
          storedMedia[4]?.url || '',
          storedMedia[0]?.legende || '',
          storedMedia[1]?.legende || '',
          storedMedia[2]?.legende || '',
          storedMedia[3]?.legende || '',
          storedMedia[4]?.legende || '',
          // JSON complet
          fullJson
        ];
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
        }

        // Check if header row exists
        const headerCheckResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:B1`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const headerCheck = await headerCheckResponse.json();
        const hasHeader = headerCheck.values && headerCheck.values.length > 0 && headerCheck.values[0].length > 0;

        // Add headers if missing
        if (!hasHeader) {
          console.log(`Adding headers to sheet: ${sheetName}`);
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
