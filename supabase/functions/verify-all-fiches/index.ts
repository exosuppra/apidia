import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationConfig {
  id: string;
  is_enabled: boolean;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  fiches_per_run: number;
  days_between_verification: number;
  exclude_recently_modified: boolean;
  days_consider_recent: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

function calculateNextRun(scheduleType: string, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  next.setHours(3, 0, 0, 0); // 3h du matin
  
  switch (scheduleType) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  
  return next;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      auto = false, 
      manual = false,
      limit: overrideLimit,
      days_since_verification: overrideDays 
    } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer la configuration
    const { data: configData, error: configError } = await supabase
      .from('verification_config')
      .select('*')
      .limit(1)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching config:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: VerificationConfig = configData || {
      id: '',
      is_enabled: false,
      schedule_type: 'monthly',
      fiches_per_run: 30,
      days_between_verification: 30,
      exclude_recently_modified: true,
      days_consider_recent: 7,
      last_run_at: null,
      next_run_at: null,
    };

    // Si appel automatique (cron), vérifier si c'est le bon moment
    if (auto && !manual) {
      if (!config.is_enabled) {
        console.log('Auto verification is disabled');
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'Auto verification disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier si c'est le bon moment selon next_run_at
      if (config.next_run_at) {
        const nextRunDate = new Date(config.next_run_at);
        if (new Date() < nextRunDate) {
          console.log(`Not time to run yet. Next run: ${config.next_run_at}`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              skipped: true, 
              reason: 'Not scheduled yet',
              next_run_at: config.next_run_at 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Paramètres de vérification
    const fichesLimit = overrideLimit || config.fiches_per_run;
    const daysSinceVerification = overrideDays || config.days_between_verification;

    // Calculer le seuil de date pour les vérifications
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysSinceVerification);

    // Récupérer les IDs des fiches récemment modifiées manuellement (si option activée)
    let excludedFicheIds: string[] = [];
    if (config.exclude_recently_modified) {
      const recentModificationThreshold = new Date();
      recentModificationThreshold.setDate(recentModificationThreshold.getDate() - config.days_consider_recent);

      const { data: recentlyModified } = await supabase
        .from('fiche_history')
        .select('fiche_id')
        .eq('action_type', 'manual_edit')
        .gte('created_at', recentModificationThreshold.toISOString());

      excludedFicheIds = [...new Set(recentlyModified?.map(f => f.fiche_id) || [])];
      console.log(`Excluding ${excludedFicheIds.length} fiches with recent manual edits`);
    }

    // Récupérer les fiches à vérifier
    // Priorité : jamais vérifiées d'abord, puis les plus anciennes
    let query = supabase
      .from('fiches_data')
      .select('fiche_id, fiche_type, last_verified_at')
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`)
      .order('last_verified_at', { ascending: true, nullsFirst: true })
      .limit(fichesLimit + excludedFicheIds.length); // Récupérer plus pour compenser les exclusions

    const { data: allFiches, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching fiches:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch fiches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les fiches exclues et limiter
    const fichesToVerify = (allFiches || [])
      .filter(f => !excludedFicheIds.includes(f.fiche_id))
      .slice(0, fichesLimit);

    console.log(`Found ${fichesToVerify.length} fiches to verify (after filtering)`);

    const results = {
      total: fichesToVerify.length,
      verified: 0,
      errors: 0,
      details: [] as Array<{ fiche_id: string; success: boolean; alerts_count?: number; error?: string }>,
    };

    // Vérifier chaque fiche
    for (const fiche of fichesToVerify) {
      try {
        console.log(`Verifying fiche: ${fiche.fiche_id}`);
        
        // Appeler la fonction verify-fiche-data
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

        // Délai entre les requêtes pour éviter le rate limiting
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

    // Mettre à jour la configuration avec last_run_at et next_run_at
    if (config.id) {
      const now = new Date();
      const nextRun = calculateNextRun(config.schedule_type, now);
      
      await supabase
        .from('verification_config')
        .update({
          last_run_at: now.toISOString(),
          next_run_at: nextRun.toISOString(),
        })
        .eq('id', config.id);
      
      console.log(`Updated config: last_run=${now.toISOString()}, next_run=${nextRun.toISOString()}`);
    }

    // Compter les fiches en attente de vérification
    const { count: pendingCount } = await supabase
      .from('fiches_data')
      .select('*', { count: 'exact', head: true })
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`);

    console.log(`Verification complete: ${results.verified} verified, ${results.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        pending_fiches: pendingCount,
        next_run_at: config.id ? calculateNextRun(config.schedule_type).toISOString() : null,
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
