import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook endpoint for Make (Make.com) or manual UI trigger.
 * Processes ONE batch per invocation. If a sync is already running,
 * it continues from where it left off. Otherwise starts a new sync.
 * 
 * The caller (Make or UI) should call this repeatedly until
 * the response contains { completed: true }.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  console.log("Trigger Apidae sync called at:", startedAt);

  try {
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

    const selectionIds = config.selection_ids || [];
    const batchSize = config.fiches_per_sync || 200;

    // If sync is already running, continue from saved offset
    let offset = 0;
    let prevSynced = 0;
    let prevCreated = 0;
    let prevUpdated = 0;
    let batchNumber = 0;
    let syncStartedAt = startedAt;

    if (config.current_sync_status === "running") {
      offset = config.current_sync_offset || 0;
      prevSynced = config.current_sync_synced || 0;
      batchNumber = config.current_sync_batch || 0;
      syncStartedAt = config.current_sync_started_at || startedAt;
      console.log(`Resuming sync from offset ${offset}, batch ${batchNumber + 1}`);
    } else {
      // Start new sync
      console.log(`Starting new Apidae sync, batch size: ${batchSize}`);
      const now = new Date();
      await supabase.from("apidae_sync_config").update({
        current_sync_status: "running",
        current_sync_total: 0,
        current_sync_synced: 0,
        current_sync_batch: 0,
        current_sync_offset: 0,
        current_sync_started_at: now.toISOString(),
        current_sync_completed_at: null,
      }).eq("id", config.id);
    }

    // Check for interruption
    if (config.current_sync_status === "interrupted") {
      return new Response(
        JSON.stringify({ success: false, interrupted: true, message: "Sync interrompue" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    batchNumber++;
    console.log(`Fetching batch ${batchNumber} at offset ${offset}...`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-apidae-fiches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
      throw new Error(`fetch-apidae-fiches failed at offset ${offset}: ${errorText}`);
    }

    const batchResult = await response.json();
    const totalFound = batchResult.total || batchResult.total_found || 0;
    const batchSynced = batchResult.processed || batchResult.synced || 0;
    const batchCreated = batchResult.inserted || batchResult.created || 0;
    const batchUpdated = batchResult.updated || 0;

    const totalSynced = prevSynced + batchSynced;
    const totalCreated = prevCreated + batchCreated;
    const totalUpdated = prevUpdated + batchUpdated;
    const newOffset = offset + batchSize;
    const isComplete = newOffset >= totalFound || batchSynced < batchSize;

    console.log(`Batch ${batchNumber}: ${batchSynced} synced, progress: ${totalSynced}/${totalFound}, complete: ${isComplete}`);

    if (isComplete) {
      const syncResult = {
        total_found: totalFound,
        synced: totalSynced,
        created: totalCreated,
        updated: totalUpdated,
        batches: batchNumber,
      };

      await supabase.from("apidae_sync_config").update({
        last_sync_at: new Date().toISOString(),
        last_sync_result: syncResult,
        current_sync_status: "completed",
        current_sync_total: totalFound,
        current_sync_synced: totalSynced,
        current_sync_batch: batchNumber,
        current_sync_offset: newOffset,
        current_sync_completed_at: new Date().toISOString(),
      }).eq("id", config.id);

      await supabase.from("apidae_sync_history").insert({
        sync_type: "automatic",
        status: "success",
        started_at: syncStartedAt,
        completed_at: new Date().toISOString(),
        triggered_by: "make-webhook",
        fiches_synced: totalSynced,
        fiches_created: totalCreated,
        fiches_updated: totalUpdated,
        details: { batches: batchNumber, selection_ids: selectionIds },
      });

      return new Response(
        JSON.stringify({
          success: true,
          completed: true,
          message: `Synchronisation terminée: ${totalSynced} fiches synchronisées`,
          result: syncResult,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // More batches needed - save progress
      await supabase.from("apidae_sync_config").update({
        current_sync_total: totalFound,
        current_sync_synced: totalSynced,
        current_sync_batch: batchNumber,
        current_sync_offset: newOffset,
      }).eq("id", config.id);

      return new Response(
        JSON.stringify({
          success: true,
          completed: false,
          message: `Batch ${batchNumber} terminé: ${totalSynced}/${totalFound} fiches`,
          batch: batchNumber,
          synced: totalSynced,
          total: totalFound,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("trigger-apidae-sync error:", error);

    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from("apidae_sync_config").update({
          current_sync_status: "error",
          current_sync_completed_at: new Date().toISOString(),
        }).neq("id", "");

        await supabase.from("apidae_sync_history").insert({
          sync_type: "automatic",
          status: "error",
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          triggered_by: "make-webhook",
          error_message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
