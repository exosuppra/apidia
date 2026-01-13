import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApidaeSearchResponse {
  numFound: number;
  objetsTouristiques: ApidaeObjet[];
}

interface ApidaeObjet {
  id: number;
  type: string;
  nom: { libelleFr?: string };
  presentation?: {
    descriptifCourt?: { libelleFr?: string };
    descriptifDetaille?: { libelleFr?: string };
  };
  localisation?: {
    adresse?: {
      adresse1?: string;
      codePostal?: string;
      commune?: { nom?: string };
    };
    geolocalisation?: {
      geoJson?: { coordinates?: number[] };
    };
  };
  informations?: {
    moyensCommunication?: Array<{
      type?: { libelleFr?: string };
      coordonnees?: { fr?: string };
    }>;
  };
  ouverture?: {
    periodeEnClair?: { libelleFr?: string };
    periodesOuvertures?: Array<{
      dateDebut?: string;
      dateFin?: string;
      horaireOuverture?: string;
      horaireFermeture?: string;
    }>;
  };
  illustrations?: Array<{
    type?: string;
    nom?: { libelleFr?: string };
    legende?: { libelleFr?: string };
    copyright?: { libelleFr?: string };
    traductionFichiers?: Array<{
      url?: string;
      urlDiaporama?: string;
    }>;
  }>;
  [key: string]: unknown;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  let supabase: ReturnType<typeof createClient> | null = null;
  let syncHistoryId: string | null = null;

  try {
    const APIDAE_API_KEY = Deno.env.get("APIDAE_API_KEY");
    const APIDAE_PROJECT_ID = Deno.env.get("APIDAE_PROJECT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!APIDAE_API_KEY || !APIDAE_PROJECT_ID) {
      throw new Error("Missing Apidae credentials");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { selectionIds = [], count = 100, first = 0, auto = false } = body;

    // Create sync history entry
    const { data: historyEntry } = await supabase
      .from("apidae_sync_history")
      .insert({
        sync_type: auto ? "automatic" : "manual",
        status: "success",
        started_at: startedAt,
        triggered_by: auto ? "cron-apidae-sync" : "manual",
      })
      .select("id")
      .single();
    
    syncHistoryId = historyEntry?.id || null;

    // Build the search query - apiKey and projetId go INSIDE the query object
    const searchQuery: Record<string, unknown> = {
      apiKey: APIDAE_API_KEY,
      projetId: parseInt(APIDAE_PROJECT_ID),
      count,
      first,
      responseFields: [
        "id",
        "type",
        "nom",
        "presentation",
        "localisation",
        "informations",
        "ouverture",
        "illustrations",
        "gpisDuPatrimoineNaturel"
      ],
    };

    if (selectionIds.length > 0) {
      searchQuery.selectionIds = selectionIds;
    }

    console.log("Fetching from Apidae with query:", JSON.stringify(searchQuery));

    // Call Apidae API with URL-encoded form data
    const params = new URLSearchParams();
    params.append("query", JSON.stringify(searchQuery));

    const apidaeResponse = await fetch(
      "https://api.apidae-tourisme.com/api/v002/recherche/list-objets-touristiques/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!apidaeResponse.ok) {
      const errorText = await apidaeResponse.text();
      console.error("Apidae API error:", apidaeResponse.status, errorText);
      throw new Error(`Apidae API error: ${apidaeResponse.status}`);
    }

    const apidaeData: ApidaeSearchResponse = await apidaeResponse.json();
    console.log(`Found ${apidaeData.numFound} fiches from Apidae`);

    // Process and store each fiche
    const results = {
      total: apidaeData.numFound,
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const objet of apidaeData.objetsTouristiques || []) {
      try {
        const ficheId = objet.id.toString();
        const ficheType = objet.type || "UNKNOWN";

        // Check if fiche already exists
        const { data: existing } = await supabase
          .from("fiches_data")
          .select("id, data")
          .eq("fiche_id", ficheId)
          .single();

        const ficheData = {
          fiche_id: ficheId,
          fiche_type: ficheType,
          source: "apidae",
          data: objet,
          last_data_update_at: new Date().toISOString(),
          synced_to_sheets: false,
        };

        if (existing) {
          // Update existing fiche
          const { error: updateError } = await supabase
            .from("fiches_data")
            .update({
              data: objet,
              last_data_update_at: new Date().toISOString(),
              synced_to_sheets: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error(`Error updating fiche ${ficheId}:`, updateError);
            results.errors.push(`Update error for ${ficheId}: ${updateError.message}`);
          } else {
            results.updated++;
          }
        } else {
          // Insert new fiche
          const { error: insertError } = await supabase
            .from("fiches_data")
            .insert(ficheData);

          if (insertError) {
            console.error(`Error inserting fiche ${ficheId}:`, insertError);
            results.errors.push(`Insert error for ${ficheId}: ${insertError.message}`);
          } else {
            results.inserted++;
          }
        }

        results.processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Error processing fiche: ${errMsg}`);
      }
    }

    // Update sync history with results
    if (supabase && syncHistoryId) {
      await supabase
        .from("apidae_sync_history")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          fiches_synced: results.processed,
          fiches_created: results.inserted,
          fiches_updated: results.updated,
          details: {
            total_found: results.total,
            errors: results.errors.slice(0, 10),
            selection_ids: selectionIds,
          },
        })
        .eq("id", syncHistoryId);
    }

    // Log the sync operation (legacy)
    await supabase.from("fiche_history").insert({
      fiche_id: "SYNC",
      action_type: "apidae_sync",
      actor_type: "system",
      actor_name: "fetch-apidae-fiches",
      metadata: {
        total: results.total,
        processed: results.processed,
        inserted: results.inserted,
        updated: results.updated,
        errors_count: results.errors.length,
      },
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-apidae-fiches error:", error);
    
    // Update sync history with error
    if (supabase && syncHistoryId) {
      await supabase
        .from("apidae_sync_history")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", syncHistoryId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
