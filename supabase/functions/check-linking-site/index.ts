import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Step 1: Fetch Apidae reference data for this commune
    let apidaeReference = "";
    if (commune) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: fiches } = await supabase
        .from("fiches_data")
        .select("fiche_id, fiche_type, data")
        .ilike("data->>localisation", `%${commune}%`)
        .limit(20);

      // Fallback: broader search using RPC
      if (!fiches || fiches.length === 0) {
        const { data: rpcFiches } = await supabase.rpc("search_fiches_apidae", {
          p_commune: commune,
          p_limit: 20,
        });
        if (rpcFiches && rpcFiches.length > 0) {
          // Re-fetch full data for these fiches
          const ids = rpcFiches.map((f: any) => f.fiche_id);
          const { data: fullFiches } = await supabase
            .from("fiches_data")
            .select("fiche_id, fiche_type, data")
            .in("fiche_id", ids)
            .limit(20);
          apidaeReference = extractApidaeReference(fullFiches || []);
        }
      } else {
        apidaeReference = extractApidaeReference(fiches);
      }
    }

    // Step 2: Scrape the URL with Firecrawl
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

    // Step 3: Use AI to analyze the content WITH Apidae reference
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const truncatedContent = pageContent.substring(0, 8000);

    const apidaeSection = apidaeReference
      ? `\n\nDONNÉES DE RÉFÉRENCE APIDAE (source de vérité) :\nVoici les informations officielles issues de la base Apidae pour la commune "${commune}". Compare les informations de la page web avec ces données de référence :\n${apidaeReference}\n`
      : `\n\nAucune donnée Apidae trouvée pour cette commune. Base ta vérification uniquement sur la cohérence du contenu.\n`;

    const prompt = `Tu es un expert en vérification de données touristiques pour la commune de "${commune}" située dans le territoire DLVA (Durance Luberon Verdon Agglomération), département des Alpes-de-Haute-Provence (04), région Provence-Alpes-Côte d'Azur.

Page analysée : ${url}
Type de contenu : ${type_contenu || "page web touristique"}
${apidaeSection}

MÉTHODE DE VÉRIFICATION :
1. Compare les informations de la page (noms, adresses, téléphones, horaires) avec les données Apidae ci-dessus.
2. Signale les ÉCARTS FACTUELS : numéro de téléphone différent, adresse incorrecte, horaires obsolètes, nom d'établissement mal orthographié.
3. Vérifie que la commune "${commune}" et le département (04) sont corrects.
4. Vérifie la cohérence des dates (pas de dates passées présentées comme futures).

RÈGLES :
- Si les informations correspondent aux données Apidae ou semblent globalement correctes, mets "is_up_to_date": true.
- Ne signale que les VRAIS écarts factuels vérifiables par rapport aux données Apidae.
- Ne signale PAS le style rédactionnel, l'absence de photos, ou des détails impossibles à vérifier.
- Si tu n'es pas sûr qu'une info est fausse, considère-la comme correcte.

${current_info ? `Informations connues sur les modifications à apporter : ${current_info}` : ''}

Contenu de la page :
---
${truncatedContent}
---

Réponds en JSON :
{
  "is_up_to_date": true/false,
  "issues": ["description précise de chaque écart factuel trouvé, en mentionnant la valeur sur la page ET la valeur de référence Apidae"],
  "suggested_email": "Email au webmaster si nécessaire avec les corrections précises, sinon chaîne vide."
}`;

    const useGemini = !!Deno.env.get('GEMINI_API_KEY');
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
