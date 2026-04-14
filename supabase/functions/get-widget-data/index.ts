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

    // Build query
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

    const { data: fiches, error: fichesErr } = await query.limit(maxFiches);

    if (fichesErr) {
      throw new Error(fichesErr.message);
    }

    // Filter by commune if needed (JSONB path)
    let results = fiches || [];
    if (filters.commune) {
      results = results.filter((f: any) => {
        const commune = f.data?.localisation?.adresse?.commune?.nom;
        return commune && commune.toLowerCase().includes(filters.commune.toLowerCase());
      });
    }

    // Format output
    const formatted = results.map((f: any) => {
      const d = f.data || {};
      const nom = d.nom?.libelleFr || d.nom?.libelleEn || "Sans nom";
      const commune = d.localisation?.adresse?.commune?.nom || "";
      const codePostal = d.localisation?.adresse?.codePostal || "";
      const descCourte = d.presentation?.descriptifCourt?.libelleFr || "";
      const descDetaillee = (d.presentation?.descriptifDetaille?.libelleFr || "").substring(0, 300);
      
      // Get first image
      let image = null;
      const illustrations = d.illustrations;
      if (Array.isArray(illustrations) && illustrations.length > 0) {
        const traductionFichiers = illustrations[0]?.traductionFichiers;
        if (Array.isArray(traductionFichiers) && traductionFichiers.length > 0) {
          image = traductionFichiers[0]?.url || null;
        }
      }
      if (image && image.startsWith("http://")) {
        image = image.replace("http://", "https://");
      }

      // Get coordinates for map
      const geoloc = d.localisation?.geolocalisation?.geoJson?.coordinates;
      const lat = geoloc ? geoloc[1] : null;
      const lng = geoloc ? geoloc[0] : null;

      // Get contact info
      const telephone = d.informations?.moyensCommunication?.find?.((m: any) => m.type?.id === 201)?.coordonnees?.fr;
      const email = d.informations?.moyensCommunication?.find?.((m: any) => m.type?.id === 204)?.coordonnees?.fr;
      const siteWeb = d.informations?.moyensCommunication?.find?.((m: any) => m.type?.id === 205)?.coordonnees?.fr;

      return {
        fiche_id: f.fiche_id,
        fiche_type: f.fiche_type,
        nom,
        commune,
        code_postal: codePostal,
        description_courte: descCourte,
        description_detaillee: descDetaillee,
        image,
        lat,
        lng,
        telephone: telephone || null,
        email: email || null,
        site_web: siteWeb || null,
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
