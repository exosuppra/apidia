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

    console.log('Fetching businesses for user:', user.id);

    // Get user's Google access token from identities
    console.log('User identities:', user.identities);
    console.log('User metadata:', user.user_metadata);
    
    // Look for Google identity
    const googleIdentity = user.identities?.find(identity => identity.provider === 'google');
    let googleAccessToken = null;
    
    if (googleIdentity) {
      // For linked identities, the token might be in different places
      googleAccessToken = googleIdentity.identity_data?.provider_token || 
                         user.user_metadata?.provider_token ||
                         user.user_metadata?.google_access_token;
    } else {
      // If no Google identity found, check user metadata
      googleAccessToken = user.user_metadata?.provider_token;
    }
    
    console.log('Google access token found:', !!googleAccessToken);
    
    if (!googleAccessToken) {
      throw new Error('No Google access token found. Please link your Google account first by clicking "Se connecter avec Google".');
    }

    console.log('Using Google access token to fetch businesses');

    // Fetch businesses from Google My Business API
    const businessResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!businessResponse.ok) {
      const errorText = await businessResponse.text();
      console.error('Google API error:', businessResponse.status, errorText);
      throw new Error(`Google API error: ${businessResponse.status}`);
    }

    const accountsData = await businessResponse.json();
    console.log('Accounts data:', accountsData);

    const businesses = [];

    // For each account, get the locations
    if (accountsData.accounts && accountsData.accounts.length > 0) {
      for (const account of accountsData.accounts) {
        try {
          const locationsResponse = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
            {
              headers: {
                'Authorization': `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (locationsResponse.ok) {
            const locationsData = await locationsResponse.json();
            console.log('Locations data for account:', account.name, locationsData);

            if (locationsData.locations) {
              for (const location of locationsData.locations) {
                businesses.push({
                  id: location.name,
                  name: location.title || location.languageCode || 'Établissement sans nom',
                  address: location.address?.addressLines?.join(', ') || location.address?.postalCode || 'Adresse non disponible',
                  averageRating: location.metadata?.averageRating || 0,
                  totalReviews: location.metadata?.reviewCount || 0,
                  unreadReviews: 0, // We'll calculate this separately if needed
                });
              }
            }
          }
        } catch (locationError) {
          console.error('Error fetching locations for account:', account.name, locationError);
        }
      }
    }

    console.log('Final businesses list:', businesses);

    return new Response(JSON.stringify({ 
      businesses,
      message: `Found ${businesses.length} businesses` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-businesses function:', error);
    
    let errorMessage = 'Une erreur est survenue';
    let statusCode = 500;
    
    if (error.message.includes('No Google access token')) {
      errorMessage = 'Token Google manquant. Veuillez vous reconnecter.';
      statusCode = 401;
    } else if (error.message.includes('Google API error')) {
      errorMessage = 'Erreur lors de la récupération des établissements Google';
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