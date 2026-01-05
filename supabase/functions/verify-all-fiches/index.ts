import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 10, days_since_verification = 30 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days_since_verification);

    // Get fiches that need verification
    // Priority: never verified > oldest verification
    const { data: fichesToVerify, error: fetchError } = await supabase
      .from('fiches_data')
      .select('fiche_id, fiche_type, last_verified_at')
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`)
      .order('last_verified_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (fetchError) {
      console.error('Error fetching fiches:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch fiches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${fichesToVerify?.length || 0} fiches to verify`);

    const results = {
      total: fichesToVerify?.length || 0,
      verified: 0,
      errors: 0,
      details: [] as Array<{ fiche_id: string; success: boolean; alerts_count?: number; error?: string }>,
    };

    // Verify each fiche
    for (const fiche of (fichesToVerify || [])) {
      try {
        console.log(`Verifying fiche: ${fiche.fiche_id}`);
        
        // Call the verify-fiche-data function
        const response = await fetch(`${supabaseUrl}/functions/v1/verify-fiche-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fiche_id: fiche.fiche_id }),
        });

        const result = await response.json();
        
        if (result.success) {
          results.verified++;
          results.details.push({
            fiche_id: fiche.fiche_id,
            success: true,
            alerts_count: result.alerts_count,
          });
        } else {
          results.errors++;
          results.details.push({
            fiche_id: fiche.fiche_id,
            success: false,
            error: result.error,
          });
        }

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error verifying fiche ${fiche.fiche_id}:`, error);
        results.errors++;
        results.details.push({
          fiche_id: fiche.fiche_id,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`Verification complete: ${results.verified} verified, ${results.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-all-fiches:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
