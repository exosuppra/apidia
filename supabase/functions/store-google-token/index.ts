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

    const { googleToken, refreshToken } = await req.json();
    
    if (!googleToken) {
      throw new Error('Google token is required');
    }

    console.log('🔑 Stockage du token Google pour l\'utilisateur:', user.id);

    // Set expiration to 1 hour from now (Google access tokens typically expire in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Insert or update the Google token
    const { data, error } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: googleToken,
        refresh_token: refreshToken || null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Erreur lors du stockage du token:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('✅ Token Google stocké avec succès');

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