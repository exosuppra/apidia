import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const isResume = body.resume === true;
    const batchSize = body.batch_size || 5;

    // Get or create config
    const { data: configs } = await supabase.from("linking_check_config").select("*").limit(1);
    const config = configs?.[0];
    if (!config) {
      return new Response(JSON.stringify({ error: "No config found" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If not resuming, start a new run
    if (!isResume) {
      // Check if already running
      if (config.current_status === "running") {
        return new Response(JSON.stringify({ message: "Already running", status: "running" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Count total sites to check
      const { count } = await supabase
        .from("linking_sites")
        .select("id", { count: "exact", head: true });

      await supabase.from("linking_check_config").update({
        current_status: "running",
        current_total: count || 0,
        current_checked: 0,
        current_errors: 0,
        current_site_url: null,
        started_at: new Date().toISOString(),
        completed_at: null,
      }).eq("id", config.id);
    }

    // Re-fetch config after potential update
    const { data: freshConfigs } = await supabase.from("linking_check_config").select("*").limit(1);
    const freshConfig = freshConfigs?.[0];

    if (!freshConfig || freshConfig.current_status !== "running") {
      return new Response(JSON.stringify({ message: "Not running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get next batch of sites not yet checked in this run
    const { data: sites } = await supabase
      .from("linking_sites")
      .select("id, url, commune_id, type_contenu, modifications")
      .or(`last_scraped_at.is.null,last_scraped_at.lt.${freshConfig.started_at}`)
      .order("last_scraped_at", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (!sites || sites.length === 0) {
      // All done
      await supabase.from("linking_check_config").update({
        current_status: "completed",
        completed_at: new Date().toISOString(),
        current_site_url: null,
      }).eq("id", freshConfig.id);

      return new Response(JSON.stringify({
        message: "Bulk check completed",
        checked: freshConfig.current_checked,
        total: freshConfig.current_total,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const AI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY || !AI_KEY) {
      await supabase.from("linking_check_config").update({
        current_status: "error",
        current_site_url: "Missing API keys",
      }).eq("id", freshConfig.id);
      throw new Error("Missing required API keys");
    }

    let checkedInBatch = 0;
    let errorsInBatch = 0;

    const startTime = Date.now();
    const BUDGET_MS = 45_000; // 45s budget

    for (const site of sites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      // Check if interrupted
      const { data: checkStatus } = await supabase
        .from("linking_check_config")
        .select("current_status")
        .eq("id", freshConfig.id)
        .single();

      if (checkStatus?.current_status !== "running") break;

      try {
        // Update current site
        await supabase.from("linking_check_config").update({
          current_site_url: site.url,
        }).eq("id", freshConfig.id);

        // Get commune name
        const { data: commune } = await supabase
          .from("linking_communes")
          .select("nom")
          .eq("id", site.commune_id)
          .single();

        // Scrape
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: site.url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        if (!scrapeResp.ok) {
          console.error(`Firecrawl error for ${site.url}`);
          await supabase.from("linking_sites").update({
            last_scraped_at: new Date().toISOString(),
            date_dernier_controle: new Date().toISOString().split("T")[0],
            last_scrape_result: { error: `Scrape failed: ${scrapeResp.status}` },
          }).eq("id", site.id);
          errorsInBatch++;
          continue;
        }

        const scrapeData = await scrapeResp.json();
        const content = (scrapeData.data?.markdown || scrapeData.markdown || "").substring(0, 8000);

        if (!content) {
          await supabase.from("linking_sites").update({
            last_scraped_at: new Date().toISOString(),
            date_dernier_controle: new Date().toISOString().split("T")[0],
            statut: "a_modifier",
            modifications: "• Impossible de récupérer le contenu de la page.",
            last_scrape_result: { error: "No content" },
          }).eq("id", site.id);
          errorsInBatch++;
          continue;
        }

        // AI analysis
        const communeName = commune?.nom || "inconnue";
        const useGemini = !!Deno.env.get("GEMINI_API_KEY");

        const prompt = `Tu es un expert en vérification de données touristiques pour la commune de "${communeName}" située dans le territoire DLVA (Durance Luberon Verdon Agglomération), département des Alpes-de-Haute-Provence (04), région Provence-Alpes-Côte d'Azur.

Page analysée : ${site.url}
Type de contenu : ${site.type_contenu || "page web touristique"}

CRITÈRES DE VÉRIFICATION — vérifie chacun de ces points :
1. La commune "${communeName}" est-elle bien mentionnée et correctement orthographiée ?
2. Le département (04 / Alpes-de-Haute-Provence) est-il correct ?
3. Les informations de contact (téléphone, email, adresse) semblent-elles plausibles et complètes ?
4. Les horaires ou périodes d'ouverture mentionnés sont-ils cohérents (pas de dates passées présentées comme futures) ?
5. Les liens vers d'autres sites fonctionnent-ils (pas de mentions de pages supprimées) ?
6. Y a-t-il des informations manifestement obsolètes (événements passés présentés comme à venir, tarifs anciens, etc.) ?
7. Le contenu est-il suffisamment riche et informatif pour un visiteur ?

RÈGLES IMPORTANTES :
- Si la page parle bien de la commune et que les informations semblent globalement correctes et à jour, mets "is_up_to_date": true même si la page n'est pas parfaite.
- Ne signale que les VRAIS problèmes factuels (erreur de nom, mauvais département, dates obsolètes, infos manifestement fausses).
- Ne signale PAS comme problème : le manque de détails, le style rédactionnel, l'absence de photos, ou des informations que tu ne peux pas vérifier.
- Si tu n'es pas sûr qu'une info est fausse, considère-la comme correcte.

Contenu de la page :
---
${content}
---

Réponds UNIQUEMENT en JSON avec ce format :
{
  "is_up_to_date": true ou false,
  "issues": ["description précise de chaque problème factuel trouvé"],
  "suggested_email": "Si is_up_to_date est false : rédige un email poli en français au webmaster mentionnant la commune ${communeName} et les corrections précises à apporter. Si true : chaîne vide."
}`;

        let aiResult: string;

        if (useGemini) {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" },
              }),
            }
          );
          const geminiData = await geminiRes.json();
          aiResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        } else {
          const lovableRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${AI_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Tu es un vérificateur de données touristiques. Tu réponds uniquement en JSON valide. Tu es indulgent : si les informations semblent globalement correctes, tu mets is_up_to_date à true." },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" },
            }),
          );
          const lovableData = await lovableRes.json();
          aiResult = lovableData.choices?.[0]?.message?.content || "{}";
        }

        let parsed;
        try {
          const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { is_up_to_date: true, issues: [] };
        } catch {
          parsed = { is_up_to_date: true, issues: [] };
        }

        // If AI says not up to date but gives no concrete issues, treat as OK
        const hasConcreteIssues = parsed.issues && parsed.issues.length > 0 && 
          !parsed.issues.every((i: string) => i.toLowerCase().includes("vérification manuelle") || i.toLowerCase().includes("impossible"));
        
        const effectiveUpToDate = parsed.is_up_to_date || !hasConcreteIssues;
        const newStatut = effectiveUpToDate ? "ok" : "a_modifier";
        let modifications: string | null = null;
        if (!effectiveUpToDate && parsed.issues?.length) {
          modifications = "• " + parsed.issues.join("\n• ");
        }

        await supabase.from("linking_sites").update({
          statut: newStatut,
          modifications,
          last_scraped_at: new Date().toISOString(),
          date_dernier_controle: new Date().toISOString().split("T")[0],
          last_scrape_result: { ...parsed, suggested_email: parsed.suggested_email || "" },
        }).eq("id", site.id);

        checkedInBatch++;

        // Rate limiting delay
        await new Promise(r => setTimeout(r, 1500));
      } catch (siteError) {
        console.error(`Error checking ${site.url}:`, siteError);
        errorsInBatch++;
      }
    }

    // Update progress
    const newChecked = (freshConfig.current_checked || 0) + checkedInBatch;
    const newErrors = (freshConfig.current_errors || 0) + errorsInBatch;

    await supabase.from("linking_check_config").update({
      current_checked: newChecked,
      current_errors: newErrors,
    }).eq("id", freshConfig.id);

    // Self-chain: fire-and-forget to process next batch
    const { count: remainingCount } = await supabase
      .from("linking_sites")
      .select("id", { count: "exact", head: true })
      .or(`last_scraped_at.is.null,last_scraped_at.lt.${freshConfig.started_at}`);

    if ((remainingCount || 0) > 0) {
      // Re-check status before chaining
      const { data: statusCheck } = await supabase
        .from("linking_check_config")
        .select("current_status")
        .eq("id", freshConfig.id)
        .single();

      if (statusCheck?.current_status === "running") {
        // Fire-and-forget: call ourselves
        fetch(`${supabaseUrl}/functions/v1/trigger-linking-check`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resume: true, batch_size: batchSize }),
        }).catch(err => console.error("Self-chain error:", err));
      }
    } else {
      // Mark complete
      await supabase.from("linking_check_config").update({
        current_status: "completed",
        completed_at: new Date().toISOString(),
        current_site_url: null,
      }).eq("id", freshConfig.id);
    }

    return new Response(JSON.stringify({
      message: `Batch done: ${checkedInBatch} checked, ${errorsInBatch} errors`,
      checked: newChecked,
      total: freshConfig.current_total,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("trigger-linking-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
