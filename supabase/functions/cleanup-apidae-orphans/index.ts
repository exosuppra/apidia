import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApidaeSearchResponse {
  numFound: number;
  objetsTouristiques: Array<{ id: number }>;
}

/**
 * Compare les fiches Apidae stockées en base avec celles actuellement présentes
 * dans la sélection Apidae configurée, puis supprime les "orphelines"
 * (fiches en base qui ne sont plus retournées par Apidae).
 *
 * Body optionnel:
 *  - dryRun: boolean (default false) — ne supprime pas, retourne juste la liste
 *  - selectionIds: number[] — override la config
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIDAE_API_KEY = Deno.env.get("APIDAE_API_KEY");
    const APIDAE_PROJECT_ID = Deno.env.get("APIDAE_PROJECT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!APIDAE_API_KEY || !APIDAE_PROJECT_ID) throw new Error("Missing Apidae credentials");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase credentials");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dryRun === true;
    let selectionIds: number[] = Array.isArray(body?.selectionIds) ? body.selectionIds : [];
    const triggeredBy: string = body?.triggeredBy || "manual";

    // Charger les selectionIds depuis la config si non fournis
    if (selectionIds.length === 0) {
      const { data: config } = await supabase
        .from("apidae_sync_config")
        .select("selection_ids")
        .single();
      selectionIds = (config?.selection_ids as number[]) || [];
    }

    if (selectionIds.length === 0) {
      return json({
        success: false,
        error: "Aucune sélection Apidae configurée. Impossible de déterminer les fiches actives.",
      }, 400);
    }

    // 1) Récupérer la liste complète des IDs Apidae actuellement dans la sélection
    const apidaeIds = new Set<string>();
    const PAGE = 200;
    let first = 0;
    let total = 0;
    let safety = 0;

    while (true) {
      safety++;
      if (safety > 500) throw new Error("Trop d'itérations lors de la récupération des IDs Apidae");

      const searchQuery: Record<string, unknown> = {
        apiKey: APIDAE_API_KEY,
        projetId: parseInt(APIDAE_PROJECT_ID),
        count: PAGE,
        first,
        selectionIds,
        responseFields: ["id"],
      };
      const params = new URLSearchParams();
      params.append("query", JSON.stringify(searchQuery));

      const resp = await fetch(
        "https://api.apidae-tourisme.com/api/v002/recherche/list-objets-touristiques/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Apidae error ${resp.status}: ${txt.slice(0, 200)}`);
      }

      const data: ApidaeSearchResponse = await resp.json();
      total = data.numFound || 0;
      const list = data.objetsTouristiques || [];
      for (const o of list) {
        if (o?.id != null) apidaeIds.add(String(o.id));
      }
      if (list.length < PAGE || first + PAGE >= total) break;
      first += PAGE;
    }

    console.log(`Apidae returned ${apidaeIds.size} fiches (total: ${total}) for selection ${selectionIds.join(",")}`);

    // Sécurité : si Apidae retourne 0 fiche, on refuse de tout supprimer
    if (apidaeIds.size === 0) {
      return json({
        success: false,
        error: "Apidae a retourné 0 fiche — suppression annulée par sécurité.",
      }, 400);
    }

    // 2) Récupérer toutes les fiches en base avec source = 'apidae'
    const dbIds: { fiche_id: string; nom: string }[] = [];
    let from = 0;
    const STEP = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("fiches_data")
        .select("fiche_id, data")
        .eq("source", "apidae")
        .range(from, from + STEP - 1);
      if (error) throw new Error(`Supabase select error: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data) {
        const nom = (row.data as any)?.nom?.libelleFr
          || (row.data as any)?.nom?.libelleEn
          || "Sans nom";
        dbIds.push({ fiche_id: row.fiche_id, nom });
      }
      if (data.length < STEP) break;
      from += STEP;
    }

    console.log(`DB contains ${dbIds.length} fiches with source='apidae'`);

    // 3) Diff : présentes en DB mais absentes d'Apidae
    const orphans = dbIds.filter((f) => !apidaeIds.has(f.fiche_id));
    console.log(`Found ${orphans.length} orphan fiches`);

    // Garde-fou : si on s'apprête à supprimer plus de 30% des fiches Apidae en base,
    // on refuse (probable problème côté API ou config)
    const ratio = dbIds.length > 0 ? orphans.length / dbIds.length : 0;
    if (!dryRun && ratio > 0.3) {
      return json({
        success: false,
        error: `Suppression annulée : ${orphans.length}/${dbIds.length} fiches (${Math.round(ratio * 100)}%) seraient supprimées. Seuil de sécurité dépassé (30%).`,
        orphans_count: orphans.length,
        db_total: dbIds.length,
        apidae_total: apidaeIds.size,
      }, 400);
    }

    if (dryRun || orphans.length === 0) {
      return json({
        success: true,
        dryRun,
        deleted: 0,
        orphans_count: orphans.length,
        orphans: orphans.slice(0, 100),
        db_total: dbIds.length,
        apidae_total: apidaeIds.size,
      });
    }

    // 4) Suppression par lots
    const orphanIds = orphans.map((o) => o.fiche_id);
    const CHUNK = 200;
    let deleted = 0;
    for (let i = 0; i < orphanIds.length; i += CHUNK) {
      const chunk = orphanIds.slice(i, i + CHUNK);
      const { error: e1 } = await supabase
        .from("fiches_data")
        .delete()
        .in("fiche_id", chunk);
      if (e1) throw new Error(`Delete fiches_data error: ${e1.message}`);

      await supabase.from("fiches_verified").delete().in("fiche_id", chunk);
      deleted += chunk.length;
    }

    // 5) Log dans l'historique de sync
    await supabase.from("apidae_sync_history").insert({
      sync_type: "cleanup",
      status: "success",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by: triggeredBy,
      fiches_synced: deleted,
      details: {
        action: "cleanup_orphans",
        deleted_count: deleted,
        deleted_ids: orphanIds.slice(0, 200),
        db_total_before: dbIds.length,
        apidae_total: apidaeIds.size,
        selection_ids: selectionIds,
      },
    });

    return json({
      success: true,
      deleted,
      orphans_count: orphans.length,
      db_total: dbIds.length,
      apidae_total: apidaeIds.size,
      sample: orphans.slice(0, 20),
    });
  } catch (error) {
    console.error("cleanup-apidae-orphans error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
