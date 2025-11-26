import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogActionBody {
  user_email: string;
  user_id_sheet?: string;
  action_type: 'login' | 'logout' | 'view_fiches' | 'request_update' | 'set_code' | 'view_details';
  action_details?: any;
  ip_address?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_email, user_id_sheet, action_type, action_details, ip_address, user_agent }: LogActionBody = await req.json();

    console.log('Logging user action:', { user_email, action_type });

    // Insert action log
    const { error } = await supabase
      .from('user_action_logs')
      .insert({
        user_email,
        user_id_sheet,
        action_type,
        action_details,
        ip_address: ip_address || req.headers.get('x-forwarded-for'),
        user_agent: user_agent || req.headers.get('user-agent'),
      });

    if (error) {
      console.error('Error inserting action log:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in log-user-action:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});