const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Step 1: Scrape the URL with Firecrawl
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

    // Step 2: Use AI to analyze the content
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const truncatedContent = pageContent.substring(0, 8000);

    const prompt = `Tu es un expert en vérification de données touristiques pour la commune de "${commune}" (DLVA - Durance Luberon Verdon Agglomération, Alpes-de-Haute-Provence).

Analyse le contenu de cette page web (type: ${type_contenu || 'inconnu'}, URL: ${url}) et détermine si les informations sont à jour et correctes.

${current_info ? `Informations connues sur les modifications à apporter : ${current_info}` : ''}

Contenu de la page :
---
${truncatedContent}
---

Réponds en JSON avec exactement ce format :
{
  "is_up_to_date": true/false,
  "issues": ["liste des problèmes trouvés"],
  "suggested_email": "Texte du mail à envoyer au webmaster si des modifications sont nécessaires. Le mail doit être poli, professionnel, en français, mentionner la commune et les corrections à apporter. Si tout est OK, laisser vide."
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
      const lovableRes = await fetch('https://api.lovable.dev/v1/chat/completions', {
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
