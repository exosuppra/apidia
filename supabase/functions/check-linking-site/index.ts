import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract detailed info from Apidae fiches for comparison
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

    return `📌 ${nom} (type: ${f.fiche_type || "inconnu"}, ID Apidae: ${f.fiche_id})\n  Adresse: ${rue}, ${cp} ${commune}\n  Contacts: ${contacts.join(" | ") || "aucun"}\n  Ouverture: ${ouvertures.join(", ") || "non renseigné"}\n  Description: ${descCourte.substring(0, 200)}`;
  });

  return entries.join("\n\n");
}

// Quick AI call to extract establishment name from scraped content
async function extractEstablishmentName(content: string, aiKey: string, useGemini: boolean): Promise<string[]> {
  const extractPrompt = `Analyse ce contenu de page web et extrait le ou les noms d'établissements touristiques mentionnés (hôtel, restaurant, camping, musée, activité, office de tourisme, etc.).

Retourne UNIQUEMENT un JSON : {"names": ["Nom 1", "Nom 2"], "contact_emails": ["email1@example.com"]}
Si aucun nom d'établissement n'est identifiable, retourne {"names": [], "contact_emails": []}
Extrais aussi toutes les adresses email de contact visibles sur la page (contact, info, webmaster, etc.).

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
      return { names: parsed.names || [], emails: parsed.contact_emails || [] };
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
      return { names: parsed.names || [], emails: parsed.contact_emails || [] };
    }
  } catch (e) {
    console.error("Failed to extract establishment name:", e);
    return { names: [], emails: [] };
  }
}

// Search Apidae for specific establishment by name + commune
async function findMatchingApidaeFiches(supabase: any, names: string[], communeName: string): Promise<any[]> {
  const allFiches: any[] = [];
  const seenIds = new Set<string>();

  for (const name of names.slice(0, 3)) {
    // Search by name + commune
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

  // If no match by name, fallback to commune-wide search (limited)
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, commune, type_contenu, current_info } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const useGemini = !!Deno.env.get('GEMINI_API_KEY');

    // Step 1: Scrape the URL
    console.log('Scraping URL:', url);
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: `Scraping failed: ${scrapeData.error || scrapeResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';

    if (!pageContent) {
      return new Response(
        JSON.stringify({
          success: true,
          is_up_to_date: false,
          issues: ['Impossible de récupérer le contenu de la page'],
          suggested_email: '',
          scrape_content: ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const truncatedContent = pageContent.substring(0, 8000);

    // Step 2: Extract establishment name from scraped content
    console.log('Extracting establishment name...');
    const establishmentNames = await extractEstablishmentName(truncatedContent, apiKey, useGemini);
    console.log('Found names:', establishmentNames);

    // Step 3: Find matching Apidae fiches
    let apidaeReference = "";
    let matchedNames: string[] = [];
    if (commune) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const matchedFiches = await findMatchingApidaeFiches(supabase, establishmentNames, commune);
      apidaeReference = extractApidaeReference(matchedFiches);
      matchedNames = matchedFiches.map((f: any) => f.data?.nom?.libelleFr || "inconnu");
      console.log(`Matched ${matchedFiches.length} Apidae fiches for names [${establishmentNames.join(", ")}] in ${commune}`);
    }

    // Step 4: AI comparison with matched Apidae data
    const matchInfo = establishmentNames.length > 0
      ? `\nÉtablissements détectés sur la page : ${establishmentNames.join(", ")}`
      : "\nAucun nom d'établissement spécifique détecté sur la page.";

    const apidaeSection = apidaeReference
      ? `\n\nFICHES APIDAE CORRESPONDANTES (source de vérité) :\nCes fiches ont été identifiées comme correspondant aux établissements mentionnés sur la page. Compare précisément les informations :\n\n${apidaeReference}\n`
      : `\n\nAucune fiche Apidae correspondante trouvée pour ${establishmentNames.join(", ") || "cette page"} à ${commune}. Base ta vérification sur la cohérence générale.\n`;

    const prompt = `Tu es un expert en vérification de données touristiques pour la commune de "${commune}" (DLVA, Alpes-de-Haute-Provence 04).

Page analysée : ${url}
Type de contenu : ${type_contenu || "page web touristique"}
${matchInfo}
${apidaeSection}

MÉTHODE DE VÉRIFICATION :
1. Compare les informations de la page avec les fiches Apidae ci-dessus (noms, adresses, téléphones, emails, horaires).
2. Signale les ÉCARTS FACTUELS PRÉCIS : "Sur la page : 04 XX XX XX XX / Apidae : 04 YY YY YY YY".
3. Vérifie la commune et le département (04).
4. Vérifie les dates (pas d'infos obsolètes).

RÈGLES :
- Si les infos correspondent ou semblent correctes → "is_up_to_date": true.
- Ne signale que les VRAIS écarts vérifiables.
- Ignore le style, les photos manquantes, les détails non vérifiables.
- En cas de doute, considère l'info comme correcte.

${current_info ? `Infos complémentaires : ${current_info}` : ''}

Contenu de la page :
---
${truncatedContent}
---

Réponds en JSON :
{
  "is_up_to_date": true/false,
  "issues": ["Écart précis avec valeur page vs valeur Apidae"],
  "suggested_email": "Email de correction au webmaster si nécessaire, sinon chaîne vide."
}`;

    let aiResult: string;
    if (useGemini) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      const geminiData = await geminiRes.json();
      aiResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else {
      const lovableRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu réponds uniquement en JSON valide.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      const lovableData = await lovableRes.json();
      aiResult = lovableData.choices?.[0]?.message?.content || '{}';
    }

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch {
      parsed = { is_up_to_date: false, issues: ['Erreur lors de l\'analyse IA'], suggested_email: '' };
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_up_to_date: parsed.is_up_to_date ?? false,
        issues: parsed.issues || [],
        suggested_email: parsed.suggested_email || '',
        scrape_content: truncatedContent.substring(0, 2000),
        matched_establishments: establishmentNames,
        matched_apidae_names: matchedNames,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
