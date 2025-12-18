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

    // Use Firecrawl to scrape with JSON extraction
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: googleMapsUrl,
        formats: [
          'markdown',
          {
            type: 'json',
            prompt: 'Extract the Google Maps place rating (number from 1 to 5, like 4.5) and total number of reviews/avis. Return rating as a decimal number and reviewCount as an integer.'
          }
        ],
        waitFor: 3000,
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
    
    // Try to get structured JSON first
    const jsonData = data.data?.json || data.json;
    console.log('JSON extraction result:', JSON.stringify(jsonData));
    
    let rating: number | null = null;
    let reviewCount: number | null = null;

    // Use JSON extraction if available
    if (jsonData) {
      if (jsonData.rating !== undefined && jsonData.rating !== null) {
        const parsed = parseFloat(String(jsonData.rating).replace(',', '.'));
        if (parsed >= 1 && parsed <= 5) {
          rating = parsed;
          console.log('Got rating from JSON:', rating);
        }
      }
      if (jsonData.reviewCount !== undefined && jsonData.reviewCount !== null) {
        const parsed = parseInt(String(jsonData.reviewCount).replace(/\D/g, ''));
        if (parsed > 0) {
          reviewCount = parsed;
          console.log('Got reviewCount from JSON:', reviewCount);
        }
      }
      // Also check alternative field names
      if (rating === null && jsonData.note !== undefined) {
        const parsed = parseFloat(String(jsonData.note).replace(',', '.'));
        if (parsed >= 1 && parsed <= 5) {
          rating = parsed;
        }
      }
      if (reviewCount === null && jsonData.avis !== undefined) {
        const parsed = parseInt(String(jsonData.avis).replace(/\D/g, ''));
        if (parsed > 0) {
          reviewCount = parsed;
        }
      }
      if (reviewCount === null && jsonData.reviews !== undefined) {
        const parsed = parseInt(String(jsonData.reviews).replace(/\D/g, ''));
        if (parsed > 0) {
          reviewCount = parsed;
        }
      }
    }

    // Fallback to markdown parsing if JSON didn't work
    if (rating === null || reviewCount === null) {
      const markdown = data.data?.markdown || data.markdown || '';
      console.log('Markdown length:', markdown.length);
      
      // Look for the specific pattern: "X,X (XXX avis)" which is Google's format
      // Example: "4,4 (185 avis)" or "4.4 (185 reviews)"
      const combinedPattern = /(\d[,.]?\d?)\s*\((\d[\d\s]*)\s*(?:avis|reviews?)\)/i;
      const combinedMatch = markdown.match(combinedPattern);
      
      if (combinedMatch) {
        console.log('Found combined pattern match:', combinedMatch[0]);
        if (rating === null) {
          const parsed = parseFloat(combinedMatch[1].replace(',', '.'));
          if (parsed >= 1 && parsed <= 5) {
            rating = parsed;
            console.log('Got rating from markdown:', rating);
          }
        }
        if (reviewCount === null) {
          const parsed = parseInt(combinedMatch[2].replace(/\s/g, ''));
          if (parsed > 0 && parsed < 100000) {
            reviewCount = parsed;
            console.log('Got reviewCount from markdown:', reviewCount);
          }
        }
      }
    }

    console.log('Final extracted values - Rating:', rating, 'Reviews:', reviewCount);

    if (rating === null && reviewCount === null) {
      return new Response(
        JSON.stringify({ 
          error: 'Impossible d\'extraire les données de notation.',
          debug: {
            jsonData: jsonData || null
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
