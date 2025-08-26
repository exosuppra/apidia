import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('🚀 GET-BUSINESSES TEST FUNCTION CALLED');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS OPTIONS for get-businesses test');
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔍 POST REQUEST for get-businesses');
  
  try {
    console.log('✅ DANS LE TRY BLOCK de get-businesses');
    
    // Retourner des données de test
    const testBusinesses = [
      {
        id: 'test-1',
        name: 'TEST - Restaurant Example',
        address: '123 Test Street, Test City',
        averageRating: 4.5,
        totalReviews: 42,
        unreadReviews: 3
      },
      {
        id: 'test-2', 
        name: 'TEST - Hotel Example',
        address: '456 Sample Avenue, Demo Town',
        averageRating: 4.2,
        totalReviews: 28,
        unreadReviews: 1
      }
    ];
    
    console.log('✅ Returning test businesses:', testBusinesses.length);
    
    return new Response(JSON.stringify({ 
      businesses: testBusinesses,
      message: `TEST: Found ${testBusinesses.length} test businesses` 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ ERREUR TEST GET-BUSINESSES:', error);
    return new Response(JSON.stringify({ 
      businesses: [],
      error: 'Erreur test get-businesses',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});