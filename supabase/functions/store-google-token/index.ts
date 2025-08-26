import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Function called:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting token storage...');
    
    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No auth header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Auth header present');
    
    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔍 Environment check:', {
      url: !!supabaseUrl,
      serviceKey: !!serviceKey,
      anonKey: !!anonKey
    });
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.log('❌ Missing environment variables');
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // User client for auth
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    console.log('🔍 User check:', { userId: user?.id, error: userError?.message });
    
    if (!user) {
      console.log('❌ No user found');
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Get request body
    const body = await req.json();
    console.log('🔍 Body received:', { hasGoogleToken: !!body.googleToken });
    
    if (!body.googleToken) {
      console.log('❌ No Google token in body');
      return new Response(JSON.stringify({ error: 'No Google token provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Service client for database operations
    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    // Create expires_at (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    console.log('🔍 Attempting database operation...');
    
    // Now we can use upsert since we have the unique constraint
    const { error: dbError } = await serviceClient
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: body.googleToken,
        refresh_token: body.refreshToken || null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (dbError) {
      console.error('❌ Database error:', dbError);
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: dbError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Token stored successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Token stored successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Global error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});