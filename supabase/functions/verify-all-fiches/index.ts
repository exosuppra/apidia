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
  // Important: a single fiche can sometimes take too long (network/AI), which can make the run look "stale"
  // and/or exceed worker limits. We cap per-fiche execution time and continue.
  const PER_FICHE_TIMEOUT_MS = 90_000;
  
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PER_FICHE_TIMEOUT_MS);

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-fiche-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fiche_id: fiche.fiche_id }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

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

type ChunkResult = {
  verified: number;
  errors: number;
  processedInCall: number;
};

async function processVerificationChunk(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  fichesToVerify: Array<{ fiche_id: string; fiche_type: string }>,
  config: VerificationConfig,
  runId: string,
  startingVerified: number,
  startingErrors: number,
  maxPerInvocation: number
): Promise<ChunkResult> {
  // NOTE: Long background loops tend to be killed by worker limits. We process a small chunk per invocation.
  const PER_FICHE_TIMEOUT_MS = 90_000;

  let verified = startingVerified;
  let errors = startingErrors;
  let processedInCall = 0;

  const toProcess = fichesToVerify.slice(0, Math.max(0, maxPerInvocation));

  console.log(
    `Processing chunk: ${toProcess.length} fiche(s) (run: ${runId}) startingVerified=${startingVerified} startingErrors=${startingErrors}`
  );

  for (let i = 0; i < toProcess.length; i++) {
    const fiche = toProcess[i];
    try {
      const globalIndex = verified + errors + 1;
      console.log(`Verifying fiche: ${fiche.fiche_id} (global ${globalIndex})`);

      await supabase
        .from('verification_config')
        .update({
          current_run_current_fiche_id: fiche.fiche_id,
          current_run_current_index: globalIndex,
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PER_FICHE_TIMEOUT_MS);

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-fiche-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fiche_id: fiche.fiche_id }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const result = await response.json().catch(() => ({}));

      if (result?.success) verified++;
      else errors++;

      processedInCall++;

      await supabase
        .from('verification_config')
        .update({
          current_run_verified: verified,
          current_run_errors: errors,
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      // Small delay to reduce rate limiting pressure
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error verifying fiche ${fiche.fiche_id}:`, error);
      errors++;
      processedInCall++;

      await supabase
        .from('verification_config')
        .update({
          current_run_verified: verified,
          current_run_errors: errors,
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);
    }
  }

  return { verified, errors, processedInCall };
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
      resume = false,  // Nouveau: reprendre une vérification interrompue
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

    // Mode reprise: vérifier si on peut reprendre une exécution interrompue
    if (resume) {
      // Vérifier qu'il y a une exécution interrompue
      if (config.current_run_status !== 'interrupted' && config.current_run_status !== 'running') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Aucune vérification à reprendre',
            current_status: config.current_run_status
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Calculer combien de fiches restent
      const alreadyProcessed = (config.current_run_verified || 0) + (config.current_run_errors || 0);
      const totalToVerify = config.current_run_total || 0;
      const remaining = totalToVerify - alreadyProcessed;
      
      if (remaining <= 0) {
        // Tout est déjà traité, marquer comme terminé
        await supabase
          .from('verification_config')
          .update({
            current_run_status: 'completed',
            current_run_completed_at: new Date().toISOString(),
          })
          .eq('id', config.id);
          
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Vérification déjà terminée',
            verified: config.current_run_verified,
            errors: config.current_run_errors
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Resuming verification: ${alreadyProcessed}/${totalToVerify} already done, ${remaining} remaining`);
      
      // Récupérer les fiches restantes à vérifier
      // On utilise le même seuil que l'exécution originale
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - config.days_between_verification);
      
      const { data: allFiches, error: fetchError } = await supabase
        .from('fiches_data')
        .select('fiche_id, fiche_type, last_verified_at')
        .eq('is_published', true)
        .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`)
        .order('last_verified_at', { ascending: true, nullsFirst: true })
        .limit(totalToVerify + 50);
      
      if (fetchError) {
        console.error('Error fetching fiches:', fetchError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch fiches' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Prendre les fiches restantes (skip les déjà traitées)
      const fichesToVerify = (allFiches || []).slice(alreadyProcessed, totalToVerify);
      
      if (fichesToVerify.length === 0) {
        await supabase
          .from('verification_config')
          .update({
            current_run_status: 'completed',
            current_run_completed_at: new Date().toISOString(),
          })
          .eq('id', config.id);
          
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Aucune fiche restante à vérifier',
            verified: config.current_run_verified,
            errors: config.current_run_errors
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Mettre à jour le statut pour reprendre
      await supabase
        .from('verification_config')
        .update({
          current_run_status: 'running',
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      const MAX_FICHES_PER_INVOCATION = 1;

      const { verified, errors, processedInCall } = await processVerificationChunk(
        supabase,
        supabaseUrl,
        supabaseServiceKey,
        fichesToVerify,
        config,
        config.current_run_id || runId,
        config.current_run_verified || 0,
        config.current_run_errors || 0,
        MAX_FICHES_PER_INVOCATION
      );

      const newAlreadyProcessed = verified + errors;
      const newRemaining = totalToVerify - newAlreadyProcessed;

      if (newRemaining <= 0) {
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
            current_run_last_heartbeat_at: now.toISOString(),
          })
          .eq('id', config.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          resumed: true,
          run_id: config.current_run_id,
          processed_in_this_call: processedInCall,
          remaining: Math.max(0, newRemaining),
          already_verified: verified,
          already_errors: errors,
          in_progress: newRemaining > 0,
          message:
            newRemaining > 0
              ? `Reprise: ${processedInCall} fiche traitée, ${newRemaining} restantes.`
              : `Reprise: terminé (${verified} OK, ${errors} erreurs).`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si une vérification est déjà en cours
    if (config.current_run_status === 'running') {
      // Vérifier si c'est vraiment en cours ou stale
      const lastHeartbeat = configData?.current_run_last_heartbeat_at;
      const isStale = lastHeartbeat && 
        (new Date().getTime() - new Date(lastHeartbeat).getTime()) > 2 * 60 * 1000;
      
      if (isStale) {
        // Marquer comme interrompu
        await supabase
          .from('verification_config')
          .update({
            current_run_status: 'interrupted',
          })
          .eq('id', config.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Vérification précédente interrompue',
            can_resume: true,
            current_run: {
              id: config.current_run_id,
              total: config.current_run_total,
              verified: config.current_run_verified,
              errors: config.current_run_errors,
            }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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

    // Récupérer les fiches à vérifier avec pagination pour dépasser la limite de 1000
    const allFiches: Array<{ fiche_id: string; fiche_type: string; last_verified_at: string | null; last_data_update_at: string | null }> = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    const maxToFetch = fichesLimit + excludedFicheIds.length + 100;
    
    while (hasMore && allFiches.length < maxToFetch) {
      const { data: pageFiches, error: fetchError } = await supabase
        .from('fiches_data')
        .select('fiche_id, fiche_type, last_verified_at, last_data_update_at')
        .eq('is_published', true)
        .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`)
        .order('last_verified_at', { ascending: true, nullsFirst: true })
        .range(offset, offset + pageSize - 1);

      if (fetchError) {
        console.error('Error fetching fiches:', fetchError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch fiches' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (pageFiches && pageFiches.length > 0) {
        allFiches.push(...pageFiches);
        offset += pageSize;
        hasMore = pageFiches.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Fetched ${allFiches.length} fiches via pagination (limit: ${fichesLimit})`);

    // Filtrer les fiches
    const fichesToVerify = allFiches
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
        current_run_last_heartbeat_at: now.toISOString(),
      })
      .eq('id', config.id);

    // Compter les fiches en attente de vérification
    const { count: pendingCount } = await supabase
      .from('fiches_data')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`);

    // IMPORTANT: process a tiny chunk immediately to avoid background worker limits.
    const MAX_FICHES_PER_INVOCATION = 1;

    const { verified, errors, processedInCall } = await processVerificationChunk(
      supabase,
      supabaseUrl,
      supabaseServiceKey,
      fichesToVerify,
      config,
      runId,
      0,
      0,
      MAX_FICHES_PER_INVOCATION
    );

    const alreadyProcessed = verified + errors;
    const remaining = fichesToVerify.length - alreadyProcessed;

    if (remaining <= 0) {
      const nowDone = new Date();
      const nextRun = calculateNextRun(config.schedule_type, nowDone);

      await supabase
        .from('verification_config')
        .update({
          current_run_status: 'completed',
          current_run_completed_at: nowDone.toISOString(),
          current_run_current_fiche_id: null,
          current_run_current_index: null,
          last_run_at: nowDone.toISOString(),
          next_run_at: nextRun.toISOString(),
          current_run_last_heartbeat_at: nowDone.toISOString(),
        })
        .eq('id', config.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        started: true,
        run_id: runId,
        total: fichesToVerify.length,
        pending_fiches: pendingCount,
        processed_in_this_call: processedInCall,
        remaining: Math.max(0, remaining),
        in_progress: remaining > 0,
        message:
          remaining > 0
            ? `Vérification démarrée: ${processedInCall} fiche traitée, ${remaining} restantes.`
            : `Vérification terminée (${verified} OK, ${errors} erreurs).`,
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
