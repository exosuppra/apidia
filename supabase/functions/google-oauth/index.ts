import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Google credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('user_google_credentials')
      .select('google_client_id, google_client_secret')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials) {
      return new Response(JSON.stringify({ error: 'Google credentials not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const { action, code, redirectUri } = await req.json();

      if (action === 'getAuthUrl') {
        const scopes = [
          'https://www.googleapis.com/auth/business.manage',
          'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${credentials.google_client_id}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `access_type=offline&` +
          `prompt=consent`;

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'exchangeCode') {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: credentials.google_client_id,
            client_secret: credentials.google_client_secret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('Token exchange error:', tokenData);
          return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save tokens to database
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const { error: tokenError } = await supabaseClient
          .from('user_google_tokens')
          .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (tokenError) {
          console.error('Error saving tokens:', tokenError);
          return new Response(JSON.stringify({ error: 'Failed to save tokens' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-oauth:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});