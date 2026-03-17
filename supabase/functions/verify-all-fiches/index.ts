import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIME_BUDGET_MS = 45_000; // 45s safety limit per invocation

interface VerificationConfig {
  id: string;
  is_enabled: boolean;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  fiches_per_run: number;
  days_between_verification: number;
  exclude_recently_modified: boolean;
  exclude_recently_imported: boolean;
  days_consider_recent: number;
  days_consider_recent_import: number;
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
  next.setHours(3, 0, 0, 0);
  
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

/**
 * Fire-and-forget: self-invoke with resume=true to process the next chunk.
 * This allows the verification to continue without the browser being open.
 */
function selfChainResume(supabaseUrl: string, supabaseServiceKey: string) {
  console.log("Self-chaining: firing next chunk...");
  // Fire-and-forget — we don't await this
  fetch(`${supabaseUrl}/functions/v1/verify-all-fiches`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resume: true }),
  }).catch((err) => {
    console.error("Self-chain fetch error (non-fatal):", err);
  });
}

async function processVerificationChunk(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  fichesToVerify: Array<{ fiche_id: string; fiche_type: string }>,
  config: VerificationConfig,
  runId: string,
  startingVerified: number,
  startingErrors: number,
  t0: number,
): Promise<{ verified: number; errors: number; processedInCall: number }> {
  const PER_FICHE_TIMEOUT_MS = 90_000;

  let verified = startingVerified;
  let errors = startingErrors;
  let processedInCall = 0;

  for (let i = 0; i < fichesToVerify.length; i++) {
    // Check time budget before starting a new fiche
    if (Date.now() - t0 > TIME_BUDGET_MS) {
      console.log(`Time budget exceeded after ${processedInCall} fiches in this call`);
      break;
    }

    // Check if run was manually interrupted
    const { data: fresh } = await supabase
      .from('verification_config')
      .select('current_run_status')
      .single();
    if (fresh?.current_run_status === 'interrupted') {
      console.log("Run was manually interrupted, stopping.");
      return { verified, errors, processedInCall };
    }

    const fiche = fichesToVerify[i];
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

  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      auto = false, 
      manual = false,
      resume = false,
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
      exclude_recently_imported: false,
      days_consider_recent: 7,
      days_consider_recent_import: 7,
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

    // ========== RESUME MODE ==========
    if (resume) {
      if (config.current_run_status === 'interrupted') {
        console.log("Run is interrupted, not resuming.");
        return new Response(
          JSON.stringify({ success: false, error: 'Vérification interrompue manuellement', current_status: 'interrupted' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (config.current_run_status !== 'running') {
        return new Response(
          JSON.stringify({ success: false, error: 'Aucune vérification à reprendre', current_status: config.current_run_status }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const alreadyProcessed = (config.current_run_verified || 0) + (config.current_run_errors || 0);
      const totalToVerify = config.current_run_total || 0;
      const remaining = totalToVerify - alreadyProcessed;
      
      if (remaining <= 0) {
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
          
        return new Response(
          JSON.stringify({ success: true, message: 'Vérification déjà terminée', verified: config.current_run_verified, errors: config.current_run_errors }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Resuming verification: ${alreadyProcessed}/${totalToVerify} already done, ${remaining} remaining`);
      
      // Fetch remaining fiches
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
      
      const fichesToVerify = (allFiches || []).slice(alreadyProcessed, totalToVerify);
      
      if (fichesToVerify.length === 0) {
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
          
        return new Response(
          JSON.stringify({ success: true, message: 'Aucune fiche restante', verified: config.current_run_verified, errors: config.current_run_errors }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update heartbeat
      await supabase
        .from('verification_config')
        .update({
          current_run_status: 'running',
          current_run_last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      const { verified, errors, processedInCall } = await processVerificationChunk(
        supabase, supabaseUrl, supabaseServiceKey,
        fichesToVerify, config,
        config.current_run_id || crypto.randomUUID(),
        config.current_run_verified || 0,
        config.current_run_errors || 0,
        t0,
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
      } else {
        // SELF-CHAIN: fire next chunk automatically
        selfChainResume(supabaseUrl, supabaseServiceKey);
      }

      return new Response(
        JSON.stringify({
          success: true, resumed: true,
          run_id: config.current_run_id,
          processed_in_this_call: processedInCall,
          remaining: Math.max(0, newRemaining),
          already_verified: verified,
          already_errors: errors,
          in_progress: newRemaining > 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== NEW RUN ==========

    // Check if already running
    if (config.current_run_status === 'running') {
      const lastHeartbeat = configData?.current_run_last_heartbeat_at;
      const isStale = lastHeartbeat && 
        (new Date().getTime() - new Date(lastHeartbeat).getTime()) > 2 * 60 * 1000;
      
      if (isStale) {
        await supabase
          .from('verification_config')
          .update({ current_run_status: 'interrupted' })
          .eq('id', config.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, error: 'Vérification précédente interrompue', can_resume: true,
            current_run: { id: config.current_run_id, total: config.current_run_total, verified: config.current_run_verified, errors: config.current_run_errors }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, error: 'Une vérification est déjà en cours',
          current_run: { id: config.current_run_id, total: config.current_run_total, verified: config.current_run_verified, errors: config.current_run_errors, started_at: config.current_run_started_at }
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto mode checks
    if (auto && !manual) {
      if (!config.is_enabled) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'Auto verification disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (config.next_run_at) {
        const nextRunDate = new Date(config.next_run_at);
        if (new Date() < nextRunDate) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: 'Not scheduled yet', next_run_at: config.next_run_at }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fetch fiches to verify
    const fichesLimit = overrideLimit || config.fiches_per_run;
    const daysSinceVerification = overrideDays || config.days_between_verification;
    const shouldApplyRecentUpdateFilters = !manual;

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysSinceVerification);

    let excludedFicheIds: string[] = [];
    if (shouldApplyRecentUpdateFilters && config.exclude_recently_modified) {
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

    const dataUpdateThreshold = new Date();
    dataUpdateThreshold.setDate(dataUpdateThreshold.getDate() - config.days_consider_recent_import);

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

    const fichesToVerify = allFiches
      .filter(f => (shouldApplyRecentUpdateFilters ? !excludedFicheIds.includes(f.fiche_id) : true))
      .filter(f => {
        if (!shouldApplyRecentUpdateFilters) return true;
        if (!config.exclude_recently_imported) return true;
        if (!f.last_data_update_at) return true;
        const updateDate = new Date(f.last_data_update_at);
        return updateDate < dataUpdateThreshold;
      })
      .slice(0, fichesLimit);
    console.log(`Found ${fichesToVerify.length} fiches to verify (after filtering)`);

    if (fichesToVerify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, verified: 0, errors: 0, message: 'No fiches to verify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runId = crypto.randomUUID();
    const now = new Date();

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

    const { count: pendingCount } = await supabase
      .from('fiches_data')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .or(`last_verified_at.is.null,last_verified_at.lt.${thresholdDate.toISOString()}`);

    // Process as many fiches as possible within the time budget
    const { verified, errors, processedInCall } = await processVerificationChunk(
      supabase, supabaseUrl, supabaseServiceKey,
      fichesToVerify, config, runId, 0, 0, t0,
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
    } else {
      // SELF-CHAIN: fire next chunk automatically
      selfChainResume(supabaseUrl, supabaseServiceKey);
    }

    return new Response(
      JSON.stringify({
        success: true, started: true,
        run_id: runId,
        total: fichesToVerify.length,
        pending_fiches: pendingCount,
        processed_in_this_call: processedInCall,
        remaining: Math.max(0, remaining),
        in_progress: remaining > 0,
        message: remaining > 0
          ? `Vérification démarrée: ${processedInCall} fiches traitées, ${remaining} restantes. Traitement automatique en arrière-plan.`
          : `Vérification terminée (${verified} OK, ${errors} erreurs).`,
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
