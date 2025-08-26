import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the current user to verify authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { businessId } = await req.json();
    
    if (!businessId) {
      throw new Error('Business ID is required');
    }

    console.log('Fetching reviews for business:', businessId);

    // Get user's Google access token
    const googleAccessToken = user.user_metadata?.provider_token;
    
    if (!googleAccessToken) {
      throw new Error('No Google access token found. Please re-authenticate with Google.');
    }

    // Fetch reviews from Google My Business API
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${businessId}/reviews`,
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!reviewsResponse.ok) {
      const errorText = await reviewsResponse.text();
      console.error('Google Reviews API error:', reviewsResponse.status, errorText);
      
      // Try alternative endpoint
      const altResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${businessId}/reviews`,
        {
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!altResponse.ok) {
        throw new Error(`Google API error: ${reviewsResponse.status}`);
      }
      
      const altData = await altResponse.json();
      const reviews = (altData.reviews || []).map((review: any) => ({
        id: review.name || review.reviewId || Math.random().toString(),
        author: review.reviewer?.displayName || 'Utilisateur anonyme',
        rating: review.starRating || 0,
        text: review.comment || '',
        createTime: review.createTime || new Date().toISOString(),
        replied: !!(review.reviewReply && review.reviewReply.comment),
      }));

      return new Response(JSON.stringify({ reviews }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reviewsData = await reviewsResponse.json();
    console.log('Reviews data:', reviewsData);

    const reviews = (reviewsData.reviews || []).map((review: any) => ({
      id: review.reviewId || review.name || Math.random().toString(),
      author: review.reviewer?.displayName || 'Utilisateur anonyme',
      rating: review.starRating || 0,
      text: review.comment || '',
      createTime: review.createTime || new Date().toISOString(),
      replied: !!(review.reviewReply && review.reviewReply.comment),
    }));

    return new Response(JSON.stringify({ reviews }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-reviews function:', error);
    
    let errorMessage = 'Une erreur est survenue lors de la récupération des avis';
    let statusCode = 500;
    
    if (error.message.includes('No Google access token')) {
      errorMessage = 'Token Google manquant. Veuillez vous reconnecter.';
      statusCode = 401;
    } else if (error.message.includes('Google API error')) {
      errorMessage = 'Erreur lors de la récupération des avis Google';
      statusCode = 502;
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message 
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});