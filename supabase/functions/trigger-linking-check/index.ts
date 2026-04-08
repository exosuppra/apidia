import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const communeFilter = body.commune_id || null;
    const batchSize = body.batch_size || 5;

    // Get sites to check: en_attente or not checked recently
    let query = supabase
      .from("linking_sites")
      .select("id, url, commune_id, type_contenu")
      .order("last_scraped_at", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (communeFilter) {
      query = query.eq("commune_id", communeFilter);
    }

    const { data: sites, error: sitesError } = await query;
    if (sitesError) throw sitesError;
    if (!sites || sites.length === 0) {
      return new Response(JSON.stringify({ message: "No sites to check", checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing required API keys (FIRECRAWL_API_KEY or LOVABLE_API_KEY)");
    }

    let checked = 0;
    const results: Array<{ site_id: string; url: string; status: string }> = [];

    for (const site of sites) {
      try {
        // Scrape via Firecrawl
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: site.url,
            formats: ["markdown"],
            timeout: 30000,
          }),
        });

        if (!scrapeResp.ok) {
          const errText = await scrapeResp.text();
          console.error(`Firecrawl error for ${site.url}:`, errText);
          await supabase.from("linking_sites").update({
            last_scraped_at: new Date().toISOString(),
            date_dernier_controle: new Date().toISOString().split("T")[0],
            last_scrape_result: { error: `Firecrawl error: ${scrapeResp.status}` },
          }).eq("id", site.id);
          results.push({ site_id: site.id, url: site.url, status: "scrape_error" });
          continue;
        }

        const scrapeData = await scrapeResp.json();
        const content = scrapeData.data?.markdown?.substring(0, 3000) || "";

        if (!content) {
          await supabase.from("linking_sites").update({
            last_scraped_at: new Date().toISOString(),
            date_dernier_controle: new Date().toISOString().split("T")[0],
            last_scrape_result: { error: "No content extracted" },
          }).eq("id", site.id);
          results.push({ site_id: site.id, url: site.url, status: "no_content" });
          continue;
        }

        // Get commune name
        const { data: commune } = await supabase
          .from("linking_communes")
          .select("nom")
          .eq("id", site.commune_id)
          .single();

        // Analyze with AI
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Tu es un expert en vérification de données touristiques. Analyse le contenu d'une page web concernant la commune de "${commune?.nom || "inconnue"}" dans les Alpes-de-Haute-Provence / Var. Vérifie si les informations sont à jour et correctes. Réponds UNIQUEMENT en JSON valide avec ce format: {"is_up_to_date": boolean, "issues": ["description du problème 1", ...], "suggested_modifications": "texte des modifications à demander si nécessaire", "summary": "résumé court de l'analyse"}`
              },
              {
                role: "user",
                content: `Analyse ce contenu de la page ${site.url} (type: ${site.type_contenu || "inconnu"}) pour la commune de ${commune?.nom || "inconnue"}:\n\n${content}`
              }
            ],
          }),
        });

        if (!aiResp.ok) {
          console.error(`AI error for ${site.url}:`, await aiResp.text());
          await supabase.from("linking_sites").update({
            last_scraped_at: new Date().toISOString(),
            date_dernier_controle: new Date().toISOString().split("T")[0],
            last_scrape_result: { error: "AI analysis failed" },
          }).eq("id", site.id);
          results.push({ site_id: site.id, url: site.url, status: "ai_error" });
          continue;
        }

        const aiData = await aiResp.json();
        const aiContent = aiData.choices?.[0]?.message?.content || "";
        
        let analysis;
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { is_up_to_date: false, issues: ["Unable to parse AI response"], summary: aiContent.substring(0, 200) };
        } catch {
          analysis = { is_up_to_date: false, issues: ["Unable to parse AI response"], summary: aiContent.substring(0, 200) };
        }

        const newStatut = analysis.is_up_to_date ? "ok" : "a_modifier";
        const modifications = analysis.is_up_to_date ? null : (analysis.suggested_modifications || analysis.issues?.join("; ") || "Vérification nécessaire");

        await supabase.from("linking_sites").update({
          statut: newStatut,
          modifications: modifications,
          last_scraped_at: new Date().toISOString(),
          date_dernier_controle: new Date().toISOString().split("T")[0],
          last_scrape_result: analysis,
        }).eq("id", site.id);

        results.push({ site_id: site.id, url: site.url, status: newStatut });
        checked++;

        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 1500));
      } catch (siteError) {
        console.error(`Error checking site ${site.url}:`, siteError);
        results.push({ site_id: site.id, url: site.url, status: "error" });
      }
    }

    return new Response(JSON.stringify({
      message: `Checked ${checked}/${sites.length} sites`,
      checked,
      total: sites.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trigger-linking-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
