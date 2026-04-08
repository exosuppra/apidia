import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract detailed info from Apidae fiches
function extractApidaeReference(fiches: any[]): string {
  if (!fiches || fiches.length === 0) return "";

  const entries = fiches.slice(0, 5).map((f: any) => {
    const d = f.data || {};
    const nom = d.nom?.libelleFr || d.nom?.libelleEn || "Sans nom";
    const adresse = d.localisation?.adresse || {};
    const commune = adresse.commune?.nom || "";
    const cp = adresse.codePostal || "";
    const rue = [adresse.adresse1, adresse.adresse2].filter(Boolean).join(", ");

    const contacts: string[] = [];
    const moyens = d.informations?.moyensCommunication || [];
    for (const m of moyens) {
      const coord = typeof m.coordonnees === "object" ? m.coordonnees?.fr : m.coordonnees;
      if (m.type?.libelleFr === "Téléphone" || m.type?.id === 201) contacts.push(`Tél: ${coord}`);
      if (m.type?.libelleFr === "Mél" || m.type?.id === 204) contacts.push(`Email: ${coord}`);
      if (m.type?.libelleFr === "Site web" || m.type?.id === 205) contacts.push(`Web: ${coord}`);
    }

    const ouvertures: string[] = [];
    const periodes = d.ouverture?.periodesOuvertures || [];
    for (const p of periodes) {
      ouvertures.push(`${p.dateDebut || "?"} → ${p.dateFin || "?"}`);
    }

    const descCourte = d.presentation?.descriptifCourt?.libelleFr || "";

    return `📌 ${nom} (type: ${f.fiche_type || "inconnu"}, ID: ${f.fiche_id})\n  Adresse: ${rue}, ${cp} ${commune}\n  Contacts: ${contacts.join(" | ") || "aucun"}\n  Ouverture: ${ouvertures.join(", ") || "non renseigné"}\n  Description: ${descCourte.substring(0, 200)}`;
  });

  return entries.join("\n\n");
}

function getScrapeErrorMessage(status: number, apiError?: string): string {
  if (status === 402) return "Scraping impossible : quota Firecrawl épuisé.";
  if (status === 429) return "Scraping temporairement limité par Firecrawl.";
  if (status === 403) return "Scraping refusé par le site cible.";

  return `Scraping impossible (${status}${apiError ? ` : ${apiError}` : ""}).`;
}

function buildScrapeErrorResult(message: string, code: string) {
  return {
    result_type: "scrape_error",
    is_up_to_date: false,
    issues: [],
    suggested_email: "",
    error_message: message,
    error_code: code,
    matched_establishments: [],
    matched_apidae_count: 0,
  };
}

// Quick AI call to extract establishment names from scraped content
async function extractEstablishmentName(content: string, aiKey: string, useGemini: boolean): Promise<string[]> {
  const extractPrompt = `Analyse ce contenu de page web et extrait le ou les noms d'établissements touristiques mentionnés (hôtel, restaurant, camping, musée, activité, office de tourisme, etc.).

Retourne UNIQUEMENT un JSON : {"names": ["Nom 1", "Nom 2"]}
Si aucun nom d'établissement n'est identifiable, retourne {"names": []}

Contenu (premiers 2000 caractères) :
${content.substring(0, 2000)}`;

  try {
    if (useGemini) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${aiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: extractPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(text);
      return parsed.names || [];
    } else {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: extractPrompt }],
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);
      return parsed.names || [];
    }
  } catch (e) {
    console.error("Failed to extract establishment name:", e);
    return [];
  }
}

// Search Apidae for specific establishment by name + commune
async function findMatchingApidaeFiches(supabase: any, names: string[], communeName: string): Promise<any[]> {
  const allFiches: any[] = [];
  const seenIds = new Set<string>();

  for (const name of names.slice(0, 3)) {
    const { data: rpcFiches } = await supabase.rpc("search_fiches_apidae", {
      p_search_term: name,
      p_commune: communeName,
      p_limit: 5,
    });

    if (rpcFiches && rpcFiches.length > 0) {
      const ids = rpcFiches.map((f: any) => f.fiche_id).filter((id: string) => !seenIds.has(id));
      ids.forEach((id: string) => seenIds.add(id));
      if (ids.length > 0) {
        const { data: fullFiches } = await supabase
          .from("fiches_data")
          .select("fiche_id, fiche_type, data")
          .in("fiche_id", ids)
          .limit(5);
        if (fullFiches) allFiches.push(...fullFiches);
      }
    }
  }

  // Fallback: commune-wide if no name match
  if (allFiches.length === 0) {
    const { data: rpcFiches } = await supabase.rpc("search_fiches_apidae", {
      p_commune: communeName,
      p_limit: 10,
    });
    if (rpcFiches && rpcFiches.length > 0) {
      const ids = rpcFiches.map((f: any) => f.fiche_id);
      const { data: fullFiches } = await supabase
        .from("fiches_data")
        .select("fiche_id, fiche_type, data")
        .in("fiche_id", ids)
        .limit(10);
      if (fullFiches) allFiches.push(...fullFiches);
    }
  }

  return allFiches;
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

    const { data: freshConfigs } = await supabase.from("linking_check_config").select("*").limit(1);
    const freshConfig = freshConfigs?.[0];

    if (!freshConfig || freshConfig.current_status !== "running") {
      return new Response(JSON.stringify({ message: "Not running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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

    const useGemini = !!Deno.env.get("GEMINI_API_KEY");
    let processedInBatch = 0;
    let errorsInBatch = 0;
    const startTime = Date.now();
    const BUDGET_MS = 45_000;

    for (const site of sites) {
      if (Date.now() - startTime > BUDGET_MS) break;

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
          const scrapeError = await scrapeResp.json().catch(() => ({}));
          const errorMessage = getScrapeErrorMessage(scrapeResp.status, scrapeError?.error);
          console.error(`Firecrawl error for ${site.url}`);
          await supabase.from("linking_sites").update({
            last_scraped_at: new Date().toISOString(),
            date_dernier_controle: new Date().toISOString().split("T")[0],
            statut: "erreur_scraping",
            modifications: null,
            last_scrape_result: buildScrapeErrorResult(errorMessage, `firecrawl_${scrapeResp.status}`),
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
            statut: "erreur_scraping",
            modifications: null,
            last_scrape_result: buildScrapeErrorResult(
              "Impossible de récupérer le contenu principal de la page.",
              "no_content",
            ),
          }).eq("id", site.id);
          errorsInBatch++;
          continue;
        }

        // Step 1: Extract establishment name
        const establishmentNames = await extractEstablishmentName(content, AI_KEY, useGemini);
        console.log(`[${site.url}] Detected names: ${establishmentNames.join(", ")}`);

        // Step 2: Find matching Apidae fiches
        const matchedFiches = await findMatchingApidaeFiches(supabase, establishmentNames, communeName);
        const apidaeReference = extractApidaeReference(matchedFiches);
        console.log(`[${site.url}] Matched ${matchedFiches.length} Apidae fiches`);

        // Step 3: AI comparison
        const matchInfo = establishmentNames.length > 0
          ? `\nÉtablissements détectés sur la page : ${establishmentNames.join(", ")}`
          : "";

        const apidaeSection = apidaeReference
          ? `\nFICHES APIDAE CORRESPONDANTES (source de vérité) :\n${apidaeReference}\n`
          : `\nAucune fiche Apidae correspondante trouvée. Vérification basée sur la cohérence uniquement.\n`;

        const prompt = `Tu es un expert en vérification de données touristiques pour "${communeName}" (DLVA, 04).

Page : ${site.url}
Type : ${site.type_contenu || "page web touristique"}
${matchInfo}
${apidaeSection}

MÉTHODE :
1. Compare infos page vs fiches Apidae (noms, adresses, téléphones, horaires).
2. Signale UNIQUEMENT les écarts factuels précis : "Page : XX / Apidae : YY".
3. Vérifie commune et département (04).
4. Vérifie dates obsolètes.

RÈGLES :
- Infos correctes ou correspondantes → "is_up_to_date": true.
- Que les VRAIS écarts vérifiables.
- Ignore style, photos, détails non vérifiables.
- Doute → correct.

Contenu :
---
${content}
---

JSON uniquement :
{
  "is_up_to_date": true/false,
  "issues": ["Écart précis : valeur page vs valeur Apidae"],
  "suggested_email": "Email correction si nécessaire, sinon chaîne vide."
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
                { role: "system", content: "Tu compares les données page web vs Apidae. JSON valide uniquement." },
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

        // Filter vague issues
        const hasConcreteIssues = parsed.issues && parsed.issues.length > 0 &&
          !parsed.issues.every((i: string) => i.toLowerCase().includes("vérification manuelle") || i.toLowerCase().includes("impossible"));

        const effectiveUpToDate = parsed.is_up_to_date || !hasConcreteIssues;
        const resultType = effectiveUpToDate ? "ok" : "content_mismatch";
        const newStatut = resultType === "ok" ? "ok" : "a_modifier";
        let modifications: string | null = null;
        if (!effectiveUpToDate && parsed.issues?.length) {
          modifications = "• " + parsed.issues.join("\n• ");
        }

        await supabase.from("linking_sites").update({
          statut: newStatut,
          modifications,
          last_scraped_at: new Date().toISOString(),
          date_dernier_controle: new Date().toISOString().split("T")[0],
          last_scrape_result: {
            ...parsed,
            result_type: resultType,
            suggested_email: parsed.suggested_email || "",
            error_message: "",
            error_code: "",
            matched_establishments: establishmentNames,
            matched_apidae_count: matchedFiches.length,
          },
        }).eq("id", site.id);

        // Rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (siteError) {
        console.error(`Error checking ${site.url}:`, siteError);
        await supabase.from("linking_sites").update({
          last_scraped_at: new Date().toISOString(),
          date_dernier_controle: new Date().toISOString().split("T")[0],
          statut: "erreur_scraping",
          modifications: null,
          last_scrape_result: buildScrapeErrorResult(
            siteError instanceof Error
              ? `Erreur lors de la vérification : ${siteError.message}`
              : "Erreur inconnue lors de la vérification.",
            "runtime_error",
          ),
        }).eq("id", site.id);
        errorsInBatch++;
      } finally {
        processedInBatch++;
      }
    }

    // Update progress
    const newChecked = (freshConfig.current_checked || 0) + processedInBatch;
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
      message: `Batch done: ${processedInBatch} processed, ${errorsInBatch} errors`,
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
