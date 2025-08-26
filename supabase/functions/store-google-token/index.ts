import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 === DÉBUT STORE-GOOGLE-TOKEN ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse CORS OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 === ÉTAPE 1: VÉRIFICATION AUTH HEADER ===');
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header:', authHeader ? 'PRÉSENT' : 'ABSENT');
    
    if (!authHeader) {
      console.log('❌ Pas d\'auth header');
      throw new Error('No authorization header');
    }

    console.log('🔍 === ÉTAPE 2: CRÉATION CLIENTS SUPABASE ===');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Clés disponibles:', {
      serviceKey: serviceKey ? 'PRÉSENT' : 'ABSENT',
      anonKey: anonKey ? 'PRÉSENT' : 'ABSENT',
      supabaseUrl: supabaseUrl ? 'PRÉSENT' : 'ABSENT'
    });

    // Client pour récupérer l'utilisateur actuel
    const userClient = createClient(
      supabaseUrl ?? '',
      anonKey ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Créer un client avec la clé de service pour éviter les problèmes d'auth
    const serviceClient = createClient(
      supabaseUrl ?? '',
      serviceKey ?? '',
    );

    console.log('🔍 === ÉTAPE 3: RÉCUPÉRATION UTILISATEUR ===');
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    console.log('Résultat getUser:', {
      user: user?.id || 'AUCUN',
      userEmail: user?.email || 'AUCUN',
      error: userError?.message || 'AUCUNE'
    });
    
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      throw new Error(`User not authenticated: ${userError?.message}`);
    }

    console.log('🔍 === ÉTAPE 4: LECTURE BODY REQUEST ===');
    const requestBody = await req.json();
    console.log('Body reçu:', requestBody);
    
    const { googleToken, refreshToken } = requestBody;
    
    console.log('Tokens extraits:', {
      hasGoogleToken: !!googleToken,
      googleTokenLength: googleToken?.length || 0,
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    if (!googleToken) {
      console.log('❌ Pas de Google token');
      throw new Error('Google token is required');
    }

    console.log('🔍 === ÉTAPE 5: PRÉPARATION DONNÉES ===');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    console.log('Expiration calculée:', expiresAt.toISOString());

    console.log('🔍 === ÉTAPE 6: VÉRIFICATION TOKEN EXISTANT ===');
    const { data: existingToken, error: selectError } = await serviceClient
      .from('user_google_tokens')
      .select('id')
      .eq('user_id', user.id)
      .single();

    console.log('Résultat vérification:', {
      existingToken: existingToken ? 'TROUVÉ' : 'AUCUN',
      selectError: selectError?.message || 'AUCUNE'
    });

    console.log('🔍 === ÉTAPE 7: OPÉRATION BASE DE DONNÉES ===');
    let result;
    if (existingToken) {
      console.log('🔄 Mise à jour token existant...');
      result = await serviceClient
        .from('user_google_tokens')
        .update({
          access_token: googleToken,
          refresh_token: refreshToken || null,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } else {
      console.log('➕ Création nouveau token...');
      result = await serviceClient
        .from('user_google_tokens')
        .insert({
          user_id: user.id,
          access_token: googleToken,
          refresh_token: refreshToken || null,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    const { data, error } = result;
    console.log('🔍 === ÉTAPE 8: RÉSULTAT OPÉRATION ===');
    console.log('Résultat:', {
      data: data ? 'SUCCESS' : 'NULL',
      error: error?.message || 'AUCUNE'
    });

    if (error) {
      console.error('❌ Erreur lors du stockage:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('✅ === SUCCÈS COMPLET ===');
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Token Google stocké avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ === ERREUR GLOBALE ===');
    console.error('Type d\'erreur:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Erreur lors du stockage du token Google',
      details: error.message,
      type: error.constructor.name 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});