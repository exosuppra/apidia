import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract key info from Apidae fiches for comparison
function extractApidaeReference(fiches: any[]): string {
  if (!fiches || fiches.length === 0) return "";

  const entries = fiches.slice(0, 15).map((f: any) => {
    const d = f.data || {};
    const nom = d.nom?.libelleFr || d.nom?.libelleEn || "Sans nom";
    const adresse = d.localisation?.adresse || {};
    const commune = adresse.commune?.nom || "";
    const cp = adresse.codePostal || "";
    const rue = [adresse.adresse1, adresse.adresse2].filter(Boolean).join(", ");

    const contacts: string[] = [];
    const moyens = d.informations?.moyensCommunication || [];
    for (const m of moyens) {
      if (m.type?.libelleFr === "Téléphone" || m.type?.id === 201) contacts.push(`Tel: ${m.coordonnees?.fr || m.coordonnees}`);
      if (m.type?.libelleFr === "Mél" || m.type?.id === 204) contacts.push(`Email: ${m.coordonnees?.fr || m.coordonnees}`);
      if (m.type?.libelleFr === "Site web" || m.type?.id === 205) contacts.push(`Web: ${m.coordonnees?.fr || m.coordonnees}`);
    }

    const ouvertures: string[] = [];
    const periodes = d.ouverture?.periodesOuvertures || [];
    for (const p of periodes) {
      ouvertures.push(`${p.dateDebut || "?"} → ${p.dateFin || "?"}`);
    }

    return `- ${nom} (${f.fiche_type || ""})\n  Adresse: ${rue}, ${cp} ${commune}\n  ${contacts.join(" | ")}\n  Ouverture: ${ouvertures.join(", ") || "non renseigné"}`;
  });

  return entries.join("\n");
}

// Cache for Apidae data per commune to avoid repeated queries
const communeApidaeCache = new Map<string, string>();

async function getApidaeReferenceForCommune(supabase: any, communeName: string): Promise<string> {
  if (communeApidaeCache.has(communeName)) {
    return communeApidaeCache.get(communeName)!;
  }

  let reference = "";
  const { data: rpcFiches } = await supabase.rpc("search_fiches_apidae", {
    p_commune: communeName,
    p_limit: 20,
  });

  if (rpcFiches && rpcFiches.length > 0) {
    const ids = rpcFiches.map((f: any) => f.fiche_id);
    const { data: fullFiches } = await supabase
      .from("fiches_data")
      .select("fiche_id, fiche_type, data")
      .in("fiche_id", ids)
      .limit(20);
    reference = extractApidaeReference(fullFiches || []);
  }

  communeApidaeCache.set(communeName, reference);
  return reference;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const isResume = body.resume === true;
    const batchSize = body.batch_size || 5;

    // Get config
    const { data: configs } = await supabase.from("linking_check_config").select("*").limit(1);
    const config = configs?.[0];
    if (!config) {
      return new Response(JSON.stringify({ error: "No config found" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If not resuming, start a new run
    if (!isResume) {
      if (config.current_status === "running") {
        return new Response(JSON.stringify({ message: "Already running", status: "running" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

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

    // Re-fetch config
    const { data: freshConfigs } = await supabase.from("linking_check_config").select("*").limit(1);
    const freshConfig = freshConfigs?.[0];

    if (!freshConfig || freshConfig.current_status !== "running") {
      return new Response(JSON.stringify({ message: "Not running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get next batch
    const { data: sites } = await supabase
      .from("linking_sites")
      .select("id, url, commune_id, type_contenu, modifications")
      .or(`last_scraped_at.is.null,last_scraped_at.lt.${freshConfig.started_at}`)
      .order("last_scraped_at", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (!sites || sites.length === 0) {
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
    const BUDGET_MS = 45_000;

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
        await supabase.from("linking_check_config").update({
          current_site_url: site.url,
        }).eq("id", freshConfig.id);

        // Get commune name
        const { data: commune } = await supabase
          .from("linking_communes")
          .select("nom")
          .eq("id", site.commune_id)
          .single();

        const communeName = commune?.nom || "inconnue";

        // Fetch Apidae reference data for this commune
        const apidaeReference = await getApidaeReferenceForCommune(supabase, communeName);

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

        // AI analysis with Apidae reference
        const useGemini = !!Deno.env.get("GEMINI_API_KEY");

        const apidaeSection = apidaeReference
          ? `\nDONNÉES DE RÉFÉRENCE APIDAE (source de vérité) :\nVoici les informations officielles issues de la base Apidae pour la commune "${communeName}". Compare les informations de la page avec ces données :\n${apidaeReference}\n`
          : `\nAucune donnée Apidae trouvée pour cette commune. Base ta vérification uniquement sur la cohérence du contenu.\n`;

        const prompt = `Tu es un expert en vérification de données touristiques pour la commune de "${communeName}" située dans le territoire DLVA (Durance Luberon Verdon Agglomération), département des Alpes-de-Haute-Provence (04), région Provence-Alpes-Côte d'Azur.

Page analysée : ${site.url}
Type de contenu : ${site.type_contenu || "page web touristique"}
${apidaeSection}

MÉTHODE DE VÉRIFICATION :
1. Compare les informations de la page (noms, adresses, téléphones, horaires) avec les données Apidae ci-dessus.
2. Signale les ÉCARTS FACTUELS : numéro de téléphone différent, adresse incorrecte, horaires obsolètes, nom d'établissement mal orthographié.
3. Vérifie que la commune "${communeName}" et le département (04) sont corrects.
4. Vérifie la cohérence des dates (pas de dates passées présentées comme futures).

RÈGLES IMPORTANTES :
- Si les informations correspondent aux données Apidae ou semblent globalement correctes et à jour, mets "is_up_to_date": true.
- Ne signale que les VRAIS écarts factuels vérifiables par rapport aux données Apidae.
- Ne signale PAS : le style rédactionnel, l'absence de photos, le manque de détails, ou des infos impossibles à vérifier.
- Si tu n'es pas sûr qu'une info est fausse, considère-la comme correcte.

Contenu de la page :
---
${content}
---

Réponds UNIQUEMENT en JSON :
{
  "is_up_to_date": true ou false,
  "issues": ["description précise de chaque écart, mentionnant la valeur sur la page ET la valeur Apidae de référence"],
  "suggested_email": "Si is_up_to_date est false : email poli au webmaster avec les corrections précises. Si true : chaîne vide."
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
                { role: "system", content: "Tu es un vérificateur de données touristiques. Tu réponds uniquement en JSON valide. Tu compares les données de la page avec les données Apidae de référence." },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" },
            }),
          });
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

        // Filter out vague issues
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
          last_scrape_result: { ...parsed, suggested_email: parsed.suggested_email || "", apidae_data_available: !!apidaeReference },
        }).eq("id", site.id);

        checkedInBatch++;

        // Rate limiting
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

    // Self-chain if more remain
    const { count: remainingCount } = await supabase
      .from("linking_sites")
      .select("id", { count: "exact", head: true })
      .or(`last_scraped_at.is.null,last_scraped_at.lt.${freshConfig.started_at}`);

    if ((remainingCount || 0) > 0) {
      const { data: statusCheck } = await supabase
        .from("linking_check_config")
        .select("current_status")
        .eq("id", freshConfig.id)
        .single();

      if (statusCheck?.current_status === "running") {
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
