import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();

    if (action === 'getBusinesses') {
      // Get user's Google access token from their session
      const session = user.app_metadata?.provider_token;
      
      if (!session) {
        return new Response(JSON.stringify({ error: 'No Google token found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Call Google My Business API to get businesses
      const businessResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${session}`,
          'Content-Type': 'application/json',
        }
      });

      const businessData = await businessResponse.json();
      
      if (!businessResponse.ok) {
        console.error('Google API error:', businessData);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch businesses',
          details: businessData 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ businesses: businessData.accounts || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getReviews') {
      const { locationId } = await req.json();
      const session = user.app_metadata?.provider_token;
      
      if (!session) {
        return new Response(JSON.stringify({ error: 'No Google token found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get reviews for the specific location
      const reviewsResponse = await fetch(`https://mybusiness.googleapis.com/v4/${locationId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${session}`,
          'Content-Type': 'application/json',
        }
      });

      const reviewsData = await reviewsResponse.json();
      
      if (!reviewsResponse.ok) {
        console.error('Reviews API error:', reviewsData);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch reviews',
          details: reviewsData 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ reviews: reviewsData.reviews || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-business-reviews:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});