import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('🚀 FONCTION TEST DÉMARRÉE');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS OPTIONS OK');
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔍 POST REQUEST REÇU');
  
  try {
    console.log('✅ DANS LE TRY BLOCK');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'TEST FONCTION OK - SI VOUS VOYEZ ÇA, LA FONCTION MARCHE !' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ ERREUR TEST:', error);
    return new Response(JSON.stringify({ 
      error: 'Erreur test',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});