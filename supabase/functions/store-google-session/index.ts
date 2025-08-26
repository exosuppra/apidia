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

    console.log('🔍 Récupération du token Google pour l\'utilisateur:', user.id);
    console.log('User identities:', user.identities);
    console.log('User metadata:', user.user_metadata);
    
    // Look for Google identity and extract token
    const googleIdentity = user.identities?.find(identity => identity.provider === 'google');
    let googleAccessToken = null;
    let refreshToken = null;
    
    if (googleIdentity) {
      // For linked identities, the token might be in different places
      googleAccessToken = googleIdentity.identity_data?.provider_token || 
                         user.user_metadata?.provider_token ||
                         user.user_metadata?.google_access_token;
                         
      refreshToken = googleIdentity.identity_data?.refresh_token ||
                    user.user_metadata?.refresh_token;
    } else {
      // If no Google identity found, check user metadata
      googleAccessToken = user.user_metadata?.provider_token;
      refreshToken = user.user_metadata?.refresh_token;
    }
    
    console.log('Google access token found:', !!googleAccessToken);
    console.log('Refresh token found:', !!refreshToken);
    
    if (!googleAccessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Aucun token Google trouvé dans la session. Veuillez autoriser l\'accès à Google My Business.',
          needsReauth: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store or update the token in our table
    const { data, error } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: googleAccessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      })
      .select();

    if (error) {
      console.error('❌ Erreur lors du stockage du token:', error);
      throw new Error('Impossible de stocker le token Google');
    }

    console.log('✅ Token Google stocké avec succès');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Token Google stocké avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in store-google-session function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erreur lors du stockage de la session Google',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});