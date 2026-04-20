import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get widget config
    const { data: widget, error: widgetErr } = await supabase
      .from("apidia_widgets")
      .select("*")
      .eq("share_token", token)
      .eq("is_active", true)
      .single();

    if (widgetErr || !widget) {
      return new Response(JSON.stringify({ error: "Widget not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filters = widget.filters as any || {};
    const selectedIds = widget.selected_fiche_ids || [];
    const settings = widget.settings as any || {};
    const maxFiches = settings.max_fiches || 10;

    const critereIds: number[] = Array.isArray(filters.critere_ids)
      ? filters.critere_ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x))
      : [];
    const critereMode: "any" | "all" = filters.critere_mode === "all" ? "all" : "any";

    // Build query — when critères are set, we need to fetch a larger pool to filter post-query
    let query = supabase
      .from("fiches_data")
      .select("fiche_id, fiche_type, source, data, is_published")
      .eq("is_published", true);

    // If specific IDs are selected, they take priority over category filters
    if (selectedIds.length > 0) {
      query = query.in("fiche_id", selectedIds);
    } else {
      if (filters.fiche_type) {
        query = query.eq("fiche_type", filters.fiche_type);
      }
      if (filters.source) {
        query = query.eq("source", filters.source);
      }
    }

    // If we filter by critères or commune, fetch a larger pool then apply limit after filtering
    const needsPostFilter = critereIds.length > 0 || !!filters.commune;
    const fetchLimit = needsPostFilter ? Math.min(2000, Math.max(maxFiches * 20, 200)) : maxFiches;

    const { data: fiches, error: fichesErr } = await query.limit(fetchLimit);

    if (fichesErr) {
      throw new Error(fichesErr.message);
    }

    let results = fiches || [];

    // Filter by commune (JSONB path)
    if (filters.commune) {
      results = results.filter((f: any) => {
        const commune = f.data?.localisation?.adresse?.commune?.nom;
        return commune && commune.toLowerCase().includes(filters.commune.toLowerCase());
      });
    }

    // Filter by criteresInternes
    if (critereIds.length > 0) {
      results = results.filter((f: any) => {
        const list = f.data?.criteresInternes;
        if (!Array.isArray(list)) return false;
        const ficheCritIds = new Set(list.map((c: any) => Number(c?.id)).filter((x: number) => Number.isFinite(x)));
        if (critereMode === "all") {
          return critereIds.every((id) => ficheCritIds.has(id));
        }
        return critereIds.some((id) => ficheCritIds.has(id));
      });
    }

    // Apply max limit after filtering
    if (needsPostFilter) {
      results = results.slice(0, maxFiches);
    }

    // Format output
    const formatted = results.map((f: any) => {
      const d = f.data || {};
      const nom = d.nom?.libelleFr || d.nom?.libelleEn || "Sans nom";
      const commune = d.localisation?.adresse?.commune?.nom || "";
      const horaires = d.ouverture?.periodeEnClair?.libelleFr || null;

      // Extract first image URL
      let image_url: string | null = null;
      const illustrations = d.illustrations;
      if (Array.isArray(illustrations) && illustrations.length > 0) {
        const traductionFichiers = illustrations[0]?.traductionFichiers;
        if (Array.isArray(traductionFichiers) && traductionFichiers.length > 0) {
          let url = traductionFichiers[0]?.url || null;
          if (url && url.startsWith("//")) url = "https:" + url;
          if (url && url.startsWith("http://")) url = url.replace("http://", "https://");
          image_url = url;
        }
      }

      return {
        fiche_id: f.fiche_id,
        fiche_type: f.fiche_type,
        nom,
        commune,
        horaires,
        image_url,
      };
    });

    return new Response(JSON.stringify({
      widget: {
        name: widget.name,
        type: widget.widget_type,
        settings: widget.settings,
      },
      fiches: formatted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-widget-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
