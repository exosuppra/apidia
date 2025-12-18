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

    console.log('Fetching Google Maps URL:', googleMapsUrl);

    // Fetch the Google Maps page
    const response = await fetch(googleMapsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Google Maps page:', response.status);
      return new Response(
        JSON.stringify({ error: 'Impossible de récupérer la page Google Maps' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('HTML length:', html.length);

    // Try to extract rating using multiple patterns
    let rating: number | null = null;
    let reviewCount: number | null = null;

    // Pattern 1: Look for rating in aria-label like "4.5 étoiles" or "4,5 stars"
    const ariaRatingMatch = html.match(/aria-label="(\d[,.]?\d?)\s*(?:étoiles?|stars?|Sterne)"/i);
    if (ariaRatingMatch) {
      rating = parseFloat(ariaRatingMatch[1].replace(',', '.'));
      console.log('Found rating via aria-label:', rating);
    }

    // Pattern 2: Look for rating in data structures
    if (!rating) {
      const dataRatingMatch = html.match(/"aggregateRating"[^}]*"ratingValue"[:\s]*"?(\d[,.]?\d?)"?/i);
      if (dataRatingMatch) {
        rating = parseFloat(dataRatingMatch[1].replace(',', '.'));
        console.log('Found rating via aggregateRating:', rating);
      }
    }

    // Pattern 3: Look for rating pattern like "4,5" or "4.5" followed by review indicators
    if (!rating) {
      const textRatingMatch = html.match(/(\d[,.]?\d?)\s*(?:sur\s*5|\/\s*5|out of 5)/i);
      if (textRatingMatch) {
        rating = parseFloat(textRatingMatch[1].replace(',', '.'));
        console.log('Found rating via text pattern:', rating);
      }
    }

    // Pattern 4: Look in JSON-LD structured data
    if (!rating) {
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonContent = match.replace(/<script type="application\/ld\+json">/i, '').replace(/<\/script>/i, '');
            const jsonData = JSON.parse(jsonContent);
            if (jsonData.aggregateRating?.ratingValue) {
              rating = parseFloat(jsonData.aggregateRating.ratingValue);
              console.log('Found rating via JSON-LD:', rating);
              if (jsonData.aggregateRating?.reviewCount) {
                reviewCount = parseInt(jsonData.aggregateRating.reviewCount);
                console.log('Found review count via JSON-LD:', reviewCount);
              }
              break;
            }
          } catch (e) {
            // Continue to next match
          }
        }
      }
    }

    // Extract review count if not already found
    if (reviewCount === null) {
      // Pattern: Look for review count like "(1 234 avis)" or "(1,234 reviews)"
      const reviewMatch = html.match(/\(?([\d\s.,]+)\s*(?:avis|reviews?|Rezensionen|bewertungen)\)?/i);
      if (reviewMatch) {
        const countStr = reviewMatch[1].replace(/[\s.,]/g, '');
        reviewCount = parseInt(countStr);
        console.log('Found review count via text pattern:', reviewCount);
      }
    }

    // Pattern for review count in aria-label
    if (reviewCount === null) {
      const ariaReviewMatch = html.match(/aria-label="[^"]*(\d[\d\s.,]*)\s*(?:avis|reviews?|Rezensionen)"/i);
      if (ariaReviewMatch) {
        const countStr = ariaReviewMatch[1].replace(/[\s.,]/g, '');
        reviewCount = parseInt(countStr);
        console.log('Found review count via aria-label:', reviewCount);
      }
    }

    console.log('Final extracted values - Rating:', rating, 'Reviews:', reviewCount);

    if (rating === null && reviewCount === null) {
      return new Response(
        JSON.stringify({ 
          error: 'Impossible d\'extraire les données. Vérifiez que l\'URL pointe vers un établissement Google Maps valide.',
          debug: {
            htmlLength: html.length,
            hasRatingKeywords: html.includes('étoile') || html.includes('star') || html.includes('rating'),
            hasReviewKeywords: html.includes('avis') || html.includes('review')
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
