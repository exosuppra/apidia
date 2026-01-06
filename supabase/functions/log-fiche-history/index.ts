import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HistoryLogRequest {
  fiche_id: string;
  fiche_uuid?: string;
  action_type: string; // 'create' | 'update' | 'publish' | 'unpublish' | 'verify' | 'manual_edit'
  actor_type: string; // 'user' | 'admin' | 'system'
  actor_id?: string;
  actor_name: string;
  changes?: {
    fields: Array<{
      field: string;
      label: string;
      old_value: string | null;
      new_value: string | null;
    }>;
  };
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: HistoryLogRequest = await req.json();

    if (!body.fiche_id || !body.action_type || !body.actor_type || !body.actor_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Logging fiche history:', {
      fiche_id: body.fiche_id,
      action_type: body.action_type,
      actor_name: body.actor_name
    });

    const { data, error } = await supabase
      .from('fiche_history')
      .insert({
        fiche_id: body.fiche_id,
        fiche_uuid: body.fiche_uuid || null,
        action_type: body.action_type,
        actor_type: body.actor_type,
        actor_id: body.actor_id || null,
        actor_name: body.actor_name,
        changes: body.changes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting history:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('History logged successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-fiche-history:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
