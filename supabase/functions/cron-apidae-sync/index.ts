import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron-based Apidae sync - processes ONE batch per invocation.
 * Designed to be called repeatedly (e.g. every minute by pg_cron).
 * Each call processes one batch of fiches, persists the offset,
 * and the next call picks up where it left off.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let forceSync = false;
    try {
      const body = await req.clone().json();
      forceSync = body?.force === true;
    } catch {
      const url = new URL(req.url);
      forceSync = url.searchParams.get("force") === "true";
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: config, error: configError } = await supabase
      .from("apidae_sync_config")
      .select("*")
      .single();

    if (configError) {
      throw new Error(`Failed to load sync config: ${configError.message}`);
    }

    // If a sync is already running, continue it (process next batch)
    if (config.current_sync_status === "running") {
      return await processNextBatch(supabase, config, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    // If status is "interrupted", don't restart automatically
    if (config.current_sync_status === "interrupted") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Sync was interrupted manually" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if sync is enabled
    if (!config.is_enabled && !forceSync) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Synchronisation automatique désactivée" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check schedule (skip if force)
    const now = new Date();
    if (config.next_sync_at && !forceSync) {
      const nextRun = new Date(config.next_sync_at);
      if (now < nextRun) {
        return new Response(
          JSON.stringify({ skipped: true, reason: `Prochaine sync: ${nextRun.toISOString()}`, next_sync_at: config.next_sync_at }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (forceSync) {
      console.log("Force sync requested, bypassing schedule check...");
    }

    // Start a new sync: initialize progress tracking
    console.log("Starting new Apidae sync...");
    await supabase
      .from("apidae_sync_config")
      .update({
        current_sync_status: "running",
        current_sync_total: 0,
        current_sync_synced: 0,
        current_sync_batch: 0,
        current_sync_offset: 0,
        current_sync_started_at: now.toISOString(),
        current_sync_completed_at: null,
      })
      .eq("id", config.id);

    // Process the first batch
    return await processNextBatch(supabase, { ...config, current_sync_offset: 0, current_sync_synced: 0, current_sync_batch: 0, current_sync_total: 0 }, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  } catch (error) {
    console.error("cron-apidae-sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processNextBatch(
  supabase: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  const batchSize = (config.fiches_per_sync as number) || 200;
  const offset = (config.current_sync_offset as number) || 0;
  const prevSynced = (config.current_sync_synced as number) || 0;
  const batchNumber = ((config.current_sync_batch as number) || 0) + 1;
  const selectionIds = (config.selection_ids as number[]) || [];

  console.log(`Processing batch ${batchNumber} at offset ${offset}...`);

  // Check if sync was interrupted
  const { data: freshConfig } = await supabase
    .from("apidae_sync_config")
    .select("current_sync_status")
    .single();
  
  if (freshConfig?.current_sync_status === "interrupted") {
    console.log("Sync was interrupted, stopping.");
    return new Response(
      JSON.stringify({ interrupted: true }),
      { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/fetch-apidae-fiches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      selectionIds,
      count: batchSize,
      first: offset,
      auto: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Mark sync as error
    await supabase.from("apidae_sync_config").update({
      current_sync_status: "error",
      current_sync_completed_at: new Date().toISOString(),
    }).eq("id", config.id as string);
    throw new Error(`fetch-apidae-fiches failed at offset ${offset}: ${errorText}`);
  }

  const batchResult = await response.json();
  const totalFound = batchResult.total || batchResult.total_found || 0;
  const batchSynced = batchResult.processed || batchResult.synced || 0;
  const totalSynced = prevSynced + batchSynced;
  const newOffset = offset + batchSize;
  const isComplete = newOffset >= totalFound || batchSynced < batchSize;

  console.log(`Batch ${batchNumber}: ${batchSynced} synced, progress: ${totalSynced}/${totalFound}, complete: ${isComplete}`);

  if (isComplete) {
    // Sync is done - finalize
    const syncResult = {
      total_found: totalFound,
      synced: totalSynced,
      created: batchResult.inserted || batchResult.created || 0,
      updated: batchResult.updated || 0,
      batches: batchNumber,
    };

    const scheduleType = config.schedule_type as string || "daily";
    const syncHour = config.sync_hour as number || 6;
    const nextRunAt = calculateNextRun(scheduleType, syncHour);

    await supabase.from("apidae_sync_config").update({
      last_sync_at: new Date().toISOString(),
      next_sync_at: nextRunAt.toISOString(),
      last_sync_result: syncResult,
      current_sync_status: "completed",
      current_sync_total: totalFound,
      current_sync_synced: totalSynced,
      current_sync_batch: batchNumber,
      current_sync_offset: newOffset,
      current_sync_completed_at: new Date().toISOString(),
    }).eq("id", config.id as string);

    // Log to history
    await supabase.from("apidae_sync_history").insert({
      sync_type: "automatic",
      status: "success",
      started_at: config.current_sync_started_at || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by: "cron-apidae-sync",
      fiches_synced: totalSynced,
      fiches_created: syncResult.created,
      fiches_updated: syncResult.updated,
      details: { batches: batchNumber, selection_ids: selectionIds },
    });

    return new Response(
      JSON.stringify({ success: true, completed: true, result: syncResult, next_sync_at: nextRunAt.toISOString() }),
      { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  } else {
    // More batches to go - update progress and offset
    await supabase.from("apidae_sync_config").update({
      current_sync_total: totalFound,
      current_sync_synced: totalSynced,
      current_sync_batch: batchNumber,
      current_sync_offset: newOffset,
    }).eq("id", config.id as string);

    return new Response(
      JSON.stringify({ success: true, completed: false, batch: batchNumber, synced: totalSynced, total: totalFound }),
      { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }
}

function calculateNextRun(scheduleType: string, syncHour: number): Date {
  const next = new Date();
  switch (scheduleType) {
    case "hourly":
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(syncHour, 0, 0, 0);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      next.setHours(syncHour, 0, 0, 0);
      break;
    default:
      next.setDate(next.getDate() + 1);
      next.setHours(syncHour, 0, 0, 0);
  }
  return next;
}
