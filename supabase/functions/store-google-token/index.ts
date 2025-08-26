import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('🚀 STORE-GOOGLE-TOKEN FUNCTION CALLED');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS OPTIONS for store-google-token');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting store-google-token...');
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No auth header in store-google-token');
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

    const { googleToken, refreshToken } = await req.json();
    
    if (!googleToken) {
      console.log('❌ No Google token provided');
      throw new Error('No Google token provided');
    }

    console.log('🔍 Saving Google token to database...');

    // Calculer la date d'expiration (1 heure par défaut pour Google)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // Upsert du token dans la table user_google_tokens
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: googleToken,
        refresh_token: refreshToken || null,
        expires_at: expiresAt
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (tokenError) {
      console.error('❌ Error saving token:', tokenError);
      throw new Error(`Failed to save token: ${tokenError.message}`);
    }

    console.log('✅ Token saved successfully:', tokenData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Token Google sauvegardé avec succès',
      expiresAt: expiresAt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in store-google-token function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Une erreur est survenue lors de la sauvegarde du token Google',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});