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
    console.log('🔍 Début de la fonction store-google-token');
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation pour l'identifier
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Authorization header:', authHeader ? 'PRÉSENT' : 'ABSENT');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Créer un client avec la clé de service pour éviter les problèmes d'auth
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Client pour récupérer l'utilisateur actuel
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log('🔍 Clients Supabase créés, récupération de l\'utilisateur...');

    // Get the current user to verify authentication
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    console.log('🔍 Résultat getUser:', {
      user: user?.id || 'AUCUN',
      error: userError?.message || 'AUCUNE'
    });
    
    if (userError || !user) {
      console.error('❌ Erreur d\'authentification:', userError);
      throw new Error(`User not authenticated: ${userError?.message}`);
    }

    const requestBody = await req.json();
    const { googleToken, refreshToken } = requestBody;
    
    console.log('🔍 Données reçues:', {
      hasGoogleToken: !!googleToken,
      hasRefreshToken: !!refreshToken,
      tokenLength: googleToken?.length || 0
    });
    
    if (!googleToken) {
      throw new Error('Google token is required');
    }

    console.log('🔑 Stockage du token pour l\'utilisateur:', user.id);

    // Set expiration to 1 hour from now (Google access tokens typically expire in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Insert or update the Google token using service client
    const { data, error } = await serviceClient
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

    console.log('🔍 Résultat upsert:', {
      data: data ? 'SUCCESS' : 'NULL',
      error: error?.message || 'AUCUNE'
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