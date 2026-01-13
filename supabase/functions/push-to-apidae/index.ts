import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PushRequest {
  ficheId: string;
  changes: Record<string, unknown>;
  skipValidation?: boolean;
}

// Champs supportés pour le push Apidae (champs simples uniquement)
// - apidaeField: nom du champ dans root.fieldList (niveau "métier", pas les sous-champs .libelleFr)
// - path: chemin complet dans l'objet root pour la valeur
const FIELD_MAPPINGS: Record<string, { apidaeField: string; path: string[] }> = {
  nom: { apidaeField: "nom", path: ["nom", "libelleFr"] },
  descriptifCourt: { apidaeField: "presentation.descriptifCourt", path: ["presentation", "descriptifCourt", "libelleFr"] },
  descriptifDetaille: { apidaeField: "presentation.descriptifDetaille", path: ["presentation", "descriptifDetaille", "libelleFr"] },
  adresse1: { apidaeField: "localisation.adresse.adresse1", path: ["localisation", "adresse", "adresse1"] },
  codePostal: { apidaeField: "localisation.adresse.codePostal", path: ["localisation", "adresse", "codePostal"] },
  periodeEnClair: { apidaeField: "ouverture.periodeEnClair", path: ["ouverture", "periodeEnClair", "libelleFr"] },
};

// Champs ignorés avec leur raison (pour feedback utilisateur)
const IGNORED_FIELDS: Record<string, string> = {
  commune: "Nécessite un identifiant commune Apidae (commune.id), pas un nom",
  telephone: "Nécessite la structure complète moyensCommunication avec type.id",
  email: "Nécessite la structure complète moyensCommunication avec type.id",
  siteWeb: "Nécessite la structure complète moyensCommunication avec type.id",
};

async function getOAuthToken(): Promise<string> {
  const APIDAE_CLIENT_ID = Deno.env.get("APIDAE_CLIENT_ID");
  const APIDAE_CLIENT_SECRET = Deno.env.get("APIDAE_CLIENT_SECRET");

  if (!APIDAE_CLIENT_ID || !APIDAE_CLIENT_SECRET) {
    throw new Error("Missing Apidae OAuth credentials");
  }

  // Documentation officielle Apidae: http://api.apidae-tourisme.com/oauth/token
  // Authentification via Basic Auth avec clientId:secret
  const tokenUrl = "http://api.apidae-tourisme.com/oauth/token?grant_type=client_credentials";
  
  const credentials = btoa(`${APIDAE_CLIENT_ID}:${APIDAE_CLIENT_SECRET}`);

  console.log("Requesting OAuth token from Apidae API");

  const response = await fetch(tokenUrl, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Accept": "application/json",
    },
  });

  const responseText = await response.text();
  console.log("OAuth response status:", response.status);
  
  if (!response.ok) {
    console.error("OAuth token error:", response.status, responseText);
    throw new Error(`Failed to get OAuth token: ${response.status} - ${responseText.substring(0, 200)}`);
  }

  // Check if response is HTML (error page)
  if (responseText.startsWith("<")) {
    console.error("OAuth returned HTML instead of JSON:", responseText.substring(0, 200));
    throw new Error("OAuth endpoint returned HTML error page");
  }

  const tokenData: TokenResponse = JSON.parse(responseText);
  console.log("Got OAuth token, expires in:", tokenData.expires_in, "seconds");
  return tokenData.access_token;
}

function buildApidaePayload(changes: Record<string, unknown>): { 
  fieldList: string[]; 
  root: Record<string, unknown>;
  ignoredFields: Array<{ field: string; reason: string }>;
} {
  const fieldList: string[] = [];
  const root: Record<string, unknown> = {};
  const ignoredFields: Array<{ field: string; reason: string }> = [];

  for (const [key, value] of Object.entries(changes)) {
    // Vérifier si le champ est ignoré
    if (IGNORED_FIELDS[key]) {
      console.log(`Field ignored: ${key} - ${IGNORED_FIELDS[key]}`);
      ignoredFields.push({ field: key, reason: IGNORED_FIELDS[key] });
      continue;
    }

    const mapping = FIELD_MAPPINGS[key];
    if (!mapping) {
      console.log(`Unknown field: ${key}, skipping`);
      ignoredFields.push({ field: key, reason: "Champ non reconnu" });
      continue;
    }

    // Ajouter au fieldList seulement le champ "métier" (pas de doublon)
    if (!fieldList.includes(mapping.apidaeField)) {
      fieldList.push(mapping.apidaeField);
    }

    // Construire la structure imbriquée dans root
    let current = root;
    const pathParts = mapping.path;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[pathParts[pathParts.length - 1]] = value;
  }

  return { fieldList, root, ignoredFields };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: PushRequest = await req.json();
    const { ficheId, changes, skipValidation = false } = body;

    if (!ficheId || !changes || Object.keys(changes).length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing ficheId or changes" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Pushing changes for fiche ${ficheId}:`, JSON.stringify(changes));

    // Récupérer la fiche locale pour obtenir le type Apidae
    const { data: ficheData, error: ficheError } = await supabase
      .from("fiches_data")
      .select("data, fiche_type")
      .eq("fiche_id", ficheId)
      .single();

    if (ficheError || !ficheData) {
      console.error("Error fetching fiche:", ficheError);
      return new Response(
        JSON.stringify({ error: "Fiche not found in local database" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extraire le type Apidae depuis les données de la fiche
    // Le type peut être dans data.type ou dans fiche_type
    const ficheJson = ficheData.data as Record<string, unknown>;
    const apidaeType = ficheJson?.type || ficheData.fiche_type;
    
    if (!apidaeType) {
      console.error("No type found for fiche:", ficheId);
      return new Response(
        JSON.stringify({ error: "Missing Apidae type for this fiche. Cannot push without type." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Fiche type: ${apidaeType}`);

    // Get OAuth token
    const accessToken = await getOAuthToken();
    console.log("Got OAuth token");

    // Build the Apidae payload
    const { fieldList, root, ignoredFields } = buildApidaePayload(changes);
    
    // IMPORTANT: Ajouter le type Apidae à l'objet root (requis par l'API)
    root.type = apidaeType;

    if (fieldList.length === 0) {
      const message = ignoredFields.length > 0
        ? `Aucun champ valide à mettre à jour. Champs ignorés: ${ignoredFields.map(f => f.field).join(", ")}`
        : "No valid fields to update";
      return new Response(
        JSON.stringify({ 
          error: message,
          ignoredFields 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Diagnostic logging
    console.log("=== APIDAE PUSH DIAGNOSTIC ===");
    console.log("fields:", JSON.stringify(["root"]));
    console.log("root.fieldList:", JSON.stringify(fieldList));
    console.log("root keys:", Object.keys(root));
    console.log("root content:", JSON.stringify(root));
    if (ignoredFields.length > 0) {
      console.log("Ignored fields:", JSON.stringify(ignoredFields));
    }
    console.log("==============================");

    // Prepare multipart form data for Apidae
    // D'après la doc Apidae, `fields` est la liste des *blocs* modifiés (ex: ["root"]).
    // La liste des champs modifiés à l'intérieur du bloc est portée par `root.fieldList`.
    const formData = new FormData();
    formData.append("mode", "MODIFICATION");
    formData.append("id", ficheId);
    formData.append("fields", JSON.stringify(["root"]));
    formData.append("root", JSON.stringify(root));
    formData.append("root.fieldList", JSON.stringify(fieldList));
    
    if (skipValidation) {
      formData.append("skipValidation", "true");
    }

    // Call Apidae Write API
    const apidaeResponse = await fetch(
      "https://api.apidae-tourisme.com/api/v002/ecriture/",
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const responseText = await apidaeResponse.text();
    console.log("Apidae response:", apidaeResponse.status, responseText);

    let apidaeResult;
    try {
      apidaeResult = JSON.parse(responseText);
    } catch {
      apidaeResult = { raw: responseText };
    }

    if (!apidaeResponse.ok) {
      // Log the failed attempt with debug info
      await supabase.from("fiche_history").insert({
        fiche_id: ficheId,
        action_type: "apidae_push_failed",
        actor_type: "system",
        actor_name: "push-to-apidae",
        changes,
        metadata: {
          status: apidaeResponse.status,
          error: apidaeResult,
          debug: {
            sentFields: ["root"],
            sentRootFieldList: fieldList,
            rootKeys: Object.keys(root),
          }
        },
      });

      return new Response(
        JSON.stringify({ 
          error: "Apidae API error", 
          status: apidaeResponse.status,
          details: apidaeResult,
          debug: {
            sentFields: ["root"],
            sentRootFieldList: fieldList,
            rootKeys: Object.keys(root),
          },
          ignoredFields
        }),
        {
          status: apidaeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log successful push
    await supabase.from("fiche_history").insert({
      fiche_id: ficheId,
      action_type: "apidae_push_success",
      actor_type: "system",
      actor_name: "push-to-apidae",
      changes,
      metadata: {
        apidae_response: apidaeResult,
      },
    });

    // Update local fiche to mark as synced
    await supabase
      .from("fiches_data")
      .update({ 
        synced_to_sheets: true,
        updated_at: new Date().toISOString() 
      })
      .eq("fiche_id", ficheId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ficheId,
        apidaeResponse: apidaeResult,
        pushedFields: fieldList,
        ignoredFields
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("push-to-apidae error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
