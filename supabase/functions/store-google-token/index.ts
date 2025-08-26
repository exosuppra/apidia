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

    const { code, userId } = await req.json();
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    console.log('🔄 Échange du code Google contre un token pour l\'utilisateur:', user.id);

    // Construire l'URL de redirection dynamiquement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    let redirectUri = '';
    
    if (supabaseUrl.includes('krmeineyonriifvoexkx.supabase.co')) {
      // Utiliser l'URL Lovable pour les redirections
      redirectUri = 'https://3e4b5b01-8087-41a1-8bbb-43951061b922.sandbox.lovable.dev/google-callback';
    } else {
      redirectUri = `${supabaseUrl.replace('.supabase.co', '.sandbox.lovable.dev')}/google-callback`;
    }

    // Échanger le code contre un token d'accès
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: '108211698022111711631',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Erreur échange token Google:', tokenResponse.status, errorText);
      throw new Error(`Erreur lors de l'échange du code: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token Google obtenu, expires in:', tokenData.expires_in, 'seconds');

    // Stocker le token dans notre table
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    const { data, error } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt.toISOString(),
      })
      .select();

    if (error) {
      console.error('❌ Erreur lors du stockage du token:', error);
      throw new Error('Impossible de stocker le token Google');
    }

    console.log('✅ Token Google stocké avec succès, expires at:', expiresAt.toISOString());

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Token Google stocké avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in store-google-token function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erreur lors du stockage du token Google',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});