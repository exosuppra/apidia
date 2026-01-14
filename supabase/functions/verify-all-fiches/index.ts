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
  current_run_id: string | null;
  current_run_status: string;
  current_run_total: number;
  current_run_verified: number;
  current_run_errors: number;
  current_run_started_at: string | null;
  current_run_completed_at: string | null;
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

// Background processing function
async function processVerification(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  fichesToVerify: Array<{ fiche_id: string; fiche_type: string }>,
  config: VerificationConfig,
  runId: string
) {
  console.log(`Starting background verification of ${fichesToVerify.length} fiches (run: ${runId})`);
  
  let verified = 0;
  let errors = 0;

  // Vérifier chaque fiche
  for (let i = 0; i < fichesToVerify.length; i++) {
    const fiche = fichesToVerify[i];
    try {
      console.log(`Verifying fiche: ${fiche.fiche_id} (${i + 1}/${fichesToVerify.length})`);
      
      // Mettre à jour la fiche en cours AVANT de commencer
      await supabase
        .from('verification_config')
        .update({
          current_run_current_fiche_id: fiche.fiche_id,
          current_run_current_index: i + 1,
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      
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
        verified++;
      } else {
        errors++;
      }

      // Mettre à jour la progression avec heartbeat
      await supabase
        .from('verification_config')
        .update({
          current_run_verified: verified,
          current_run_errors: errors,
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      // Délai entre les requêtes pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error verifying fiche ${fiche.fiche_id}:`, error);
      errors++;
      
      // Mettre à jour même en cas d'erreur
      await supabase
        .from('verification_config')
        .update({
          current_run_verified: verified,
          current_run_errors: errors,
        })
        .eq('id', config.id);
    }
  }

  // Marquer la vérification comme terminée
  const now = new Date();
  const nextRun = calculateNextRun(config.schedule_type, now);
  
  await supabase
    .from('verification_config')
    .update({
      current_run_status: 'completed',
      current_run_completed_at: now.toISOString(),
      current_run_current_fiche_id: null,
      current_run_current_index: null,
      last_run_at: now.toISOString(),
      next_run_at: nextRun.toISOString(),
    })
    .eq('id', config.id);

  console.log(`Background verification complete: ${verified} verified, ${errors} errors (run: ${runId})`);
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
      current_run_id: null,
      current_run_status: 'idle',
      current_run_total: 0,
      current_run_verified: 0,
      current_run_errors: 0,
      current_run_started_at: null,
      current_run_completed_at: null,
    };

    // Vérifier si une vérification est déjà en cours
    if (config.current_run_status === 'running') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Une vérification est déjà en cours',
          current_run: {
            id: config.current_run_id,
            total: config.current_run_total,
            verified: config.current_run_verified,
            errors: config.current_run_errors,
            started_at: config.current_run_started_at,
          }
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // En mode manuel on "force" la vérification
    const shouldApplyRecentUpdateFilters = !manual;

    // Calculer le seuil de date pour les vérifications
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysSinceVerification);

    // Récupérer les IDs des fiches récemment modifiées manuellement
    let excludedFicheIds: string[] = [];
    if (shouldApplyRecentUpdateFilters && config.exclude_recently_modified) {
      const recentModificationThreshold = new Date();
      recentModificationThreshold.setDate(
        recentModificationThreshold.getDate() - config.days_consider_recent
      );

      const { data: recentlyModified } = await supabase
        .from('fiche_history')
        .select('fiche_id')
        .eq('action_type', 'manual_edit')
        .gte('created_at', recentModificationThreshold.toISOString());

      excludedFicheIds = [...new Set(recentlyModified?.map(f => f.fiche_id) || [])];
      console.log(`Excluding ${excludedFicheIds.length} fiches with recent manual edits`);
    }

    // Seuil pour last_data_update_at
    const dataUpdateThreshold = new Date();
    dataUpdateThreshold.setDate(dataUpdateThreshold.getDate() - config.days_consider_recent);

    // Récupérer les fiches à vérifier
    const { data: allFiches, error: fetchError } = await supabase
      .from('fiches_data')
      .select('fiche_id, fiche_type, last_verified_at, last_data_update_at')
      .eq('is_published', true)
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`)
      .order('last_verified_at', { ascending: true, nullsFirst: true })
      .limit(fichesLimit + excludedFicheIds.length + 50);

    if (fetchError) {
      console.error('Error fetching fiches:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch fiches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les fiches
    const fichesToVerify = (allFiches || [])
      .filter(f => (shouldApplyRecentUpdateFilters ? !excludedFicheIds.includes(f.fiche_id) : true))
      .filter(f => {
        if (!shouldApplyRecentUpdateFilters) return true;
        if (!f.last_data_update_at) return true;
        const updateDate = new Date(f.last_data_update_at);
        return updateDate < dataUpdateThreshold;
      })
      .slice(0, fichesLimit);

    console.log(`Found ${fichesToVerify.length} fiches to verify (after filtering)`);

    if (fichesToVerify.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          verified: 0,
          errors: 0,
          message: 'No fiches to verify',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un ID unique pour cette exécution
    const runId = crypto.randomUUID();
    const now = new Date();

    // Initialiser la progression dans la config
    await supabase
      .from('verification_config')
      .update({
        current_run_id: runId,
        current_run_status: 'running',
        current_run_total: fichesToVerify.length,
        current_run_verified: 0,
        current_run_errors: 0,
        current_run_started_at: now.toISOString(),
        current_run_completed_at: null,
      })
      .eq('id', config.id);

    // Compter les fiches en attente de vérification
    const { count: pendingCount } = await supabase
      .from('fiches_data')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`);

    // Lancer le traitement en arrière-plan
    const backgroundTask = processVerification(
      supabase,
      supabaseUrl,
      supabaseServiceKey,
      fichesToVerify,
      config,
      runId
    );

    // @ts-ignore - EdgeRuntime is a global in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
      console.log('Background task started with EdgeRuntime.waitUntil');
    } else {
      backgroundTask.catch(err => console.error('Background task error:', err));
      console.log('Background task started without waitUntil');
    }

    // Retourner immédiatement une réponse au client
    return new Response(
      JSON.stringify({
        success: true,
        started: true,
        run_id: runId,
        total: fichesToVerify.length,
        pending_fiches: pendingCount,
        message: `Vérification de ${fichesToVerify.length} fiches lancée en arrière-plan.`,
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
