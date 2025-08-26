import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('🚀 GET-BUSINESSES FUNCTION CALLED - Version 2');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS OPTIONS for get-businesses');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting get-businesses...');
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No auth header in get-businesses');
      throw new Error('No authorization header');
    }

    console.log('✅ Auth header present');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log('🔍 Getting user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', user.id);

    // Récupérer le token Google depuis la table user_google_tokens
    console.log('🔍 Récupération du token Google...');
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_google_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('🔍 Token query result:', {
      hasToken: !!tokenData?.access_token,
      expires: tokenData?.expires_at,
      error: tokenError?.message || 'AUCUNE'
    });
    
    if (tokenError || !tokenData?.access_token) {
      console.error('❌ Token Google non trouvé:', tokenError);
      return new Response(
        JSON.stringify({ 
          businesses: [],
          error: 'Aucun compte Google connecté. Cliquez sur "Connecter Google My Business" pour lier votre compte.',
          errorCode: 'NO_GOOGLE_TOKEN'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Vérifier si le token a expiré
    if (new Date() > new Date(tokenData.expires_at)) {
      console.error('❌ Token Google expiré');
      return new Response(
        JSON.stringify({ 
          businesses: [],
          error: 'Votre connexion Google a expiré. Veuillez vous reconnecter.',
          errorCode: 'TOKEN_EXPIRED'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const googleAccessToken = tokenData.access_token;
    console.log('✅ Token Google trouvé et valide');

    console.log('🔍 Calling Google My Business API...');

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

    console.log('📡 Google API accounts response:', businessResponse.status);

    if (!businessResponse.ok) {
      const errorText = await businessResponse.text();
      console.error('❌ Google API error:', businessResponse.status, errorText);
      
      if (businessResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            businesses: [],
            error: 'Token Google expiré. Veuillez vous reconnecter.',
            errorCode: 'TOKEN_EXPIRED'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Google API error: ${businessResponse.status} - ${errorText}`);
    }

    const accountsData = await businessResponse.json();
    console.log('📡 Accounts data:', accountsData);

    const businesses = [];

    // For each account, get the locations
    if (accountsData.accounts && accountsData.accounts.length > 0) {
      console.log(`🔍 Processing ${accountsData.accounts.length} accounts...`);
      
      for (const account of accountsData.accounts) {
        try {
          console.log(`🔍 Fetching locations for account: ${account.name}`);
          
          const locationsResponse = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
            {
              headers: {
                'Authorization': `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          console.log(`📡 Locations response for ${account.name}:`, locationsResponse.status);

          if (locationsResponse.ok) {
            const locationsData = await locationsResponse.json();
            console.log(`📡 Locations data for ${account.name}:`, locationsData);

            if (locationsData.locations) {
              console.log(`✅ Found ${locationsData.locations.length} locations`);
              
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
            } else {
              console.log(`ℹ️ No locations found for account ${account.name}`);
            }
          } else {
            const errorText = await locationsResponse.text();
            console.error(`❌ Error fetching locations for ${account.name}:`, locationsResponse.status, errorText);
          }
        } catch (locationError) {
          console.error(`❌ Error processing account ${account.name}:`, locationError);
        }
      }
    } else {
      console.log('ℹ️ No accounts found');
    }

    console.log(`✅ Final businesses list: ${businesses.length} businesses found`);

    return new Response(JSON.stringify({ 
      businesses,
      message: `Found ${businesses.length} businesses` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in get-businesses function:', error);
    
    let errorMessage = 'Une erreur est survenue lors de la récupération des établissements';
    let statusCode = 500;
    
    if (error.message.includes('User not authenticated')) {
      errorMessage = 'Utilisateur non authentifié';
      statusCode = 401;
    } else if (error.message.includes('Google API error')) {
      errorMessage = 'Erreur lors de la récupération des établissements Google';
      statusCode = 502;
    }

    return new Response(JSON.stringify({ 
      businesses: [],
      error: errorMessage,
      details: error.message 
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});