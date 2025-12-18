import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { googleMapsUrl } = await req.json();

    if (!googleMapsUrl) {
      return new Response(
        JSON.stringify({ error: 'URL Google Maps requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping Google Maps URL with Firecrawl:', googleMapsUrl);

    // Use Firecrawl to scrape the page
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: googleMapsUrl,
        formats: ['markdown'],
        waitFor: 3000, // Wait for JS to render
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ error: data.error || 'Erreur Firecrawl' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Firecrawl response success:', data.success);
    
    const markdown = data.data?.markdown || data.markdown || '';
    console.log('Markdown length:', markdown.length);
    console.log('Markdown preview:', markdown.substring(0, 1000));

    // Extract rating and review count from markdown
    let rating: number | null = null;
    let reviewCount: number | null = null;

    // Pattern 1: Look for rating like "4.5" or "4,5" followed by stars/étoiles
    const ratingPatterns = [
      /(\d[,.]?\d?)\s*(?:étoiles?|stars?|sur 5|\/5)/i,
      /Note\s*[:：]?\s*(\d[,.]?\d?)/i,
      /Rating\s*[:：]?\s*(\d[,.]?\d?)/i,
      /(\d[,.]?\d?)\s*\(\d+[\s,.\d]*(?:avis|reviews?)\)/i,
    ];

    for (const pattern of ratingPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        const parsed = parseFloat(match[1].replace(',', '.'));
        if (parsed >= 1 && parsed <= 5) {
          rating = parsed;
          console.log('Found rating:', rating, 'with pattern:', pattern);
          break;
        }
      }
    }

    // Pattern 2: Look for review count like "(1 234 avis)" or "1,234 reviews"
    const reviewPatterns = [
      /\(?([\d\s.,]+)\s*(?:avis|reviews?|Rezensionen|bewertungen)\)?/i,
      /(\d[\d\s.,]*)\s*(?:avis|reviews?)/i,
    ];

    for (const pattern of reviewPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        const countStr = match[1].replace(/[\s.,]/g, '');
        const parsed = parseInt(countStr);
        if (parsed > 0 && parsed < 1000000) {
          reviewCount = parsed;
          console.log('Found review count:', reviewCount, 'with pattern:', pattern);
          break;
        }
      }
    }

    console.log('Final extracted values - Rating:', rating, 'Reviews:', reviewCount);

    if (rating === null && reviewCount === null) {
      return new Response(
        JSON.stringify({ 
          error: 'Impossible d\'extraire les données de notation.',
          debug: {
            markdownLength: markdown.length,
            markdownPreview: markdown.substring(0, 500)
          }
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        rating,
        reviewCount,
        fetchedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-google-rating:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors du scraping' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
