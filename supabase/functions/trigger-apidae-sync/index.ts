import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook endpoint for Make (Make.com) to trigger Apidae synchronization.
 * This function is called by Make workflows to sync fiches from Apidae.
 * 
 * POST /trigger-apidae-sync
 * Optional body: { api_key?: string }
 * 
 * The api_key can be passed for additional security validation.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  console.log("Trigger Apidae sync webhook called at:", startedAt);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Optional: validate API key if provided
    let body: { api_key?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON is fine
    }

    // Get sync configuration
    const { data: config, error: configError } = await supabase
      .from("apidae_sync_config")
      .select("*")
      .single();

    if (configError) {
      throw new Error(`Failed to load sync config: ${configError.message}`);
    }

    const selectionIds = config.selection_ids || [];
    const batchSize = config.fiches_per_sync || 200;

    console.log(`Starting Apidae sync with ${selectionIds.length} selection(s), batch size: ${batchSize}`);

    // Initialize progress tracking
    const now = new Date();
    await supabase
      .from("apidae_sync_config")
      .update({
        current_sync_status: "running",
        current_sync_total: 0,
        current_sync_synced: 0,
        current_sync_batch: 0,
        current_sync_started_at: now.toISOString(),
        current_sync_completed_at: null,
      })
      .eq("id", config.id);

    // Paginate through all fiches
    let offset = 0;
    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFound = 0;
    let hasMore = true;
    let batchNumber = 0;

    while (hasMore) {
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
          auto: true, // Mark as automatic (from Make webhook)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fetch-apidae-fiches failed at offset ${offset}: ${errorText}`);
      }

      const batchResult = await response.json();

      totalFound = batchResult.total || totalFound;
      totalSynced += batchResult.processed || 0;
      totalCreated += batchResult.inserted || 0;
      totalUpdated += batchResult.updated || 0;

      offset += batchSize;

      // Update progress in real-time
      await supabase
        .from("apidae_sync_config")
        .update({
          current_sync_total: totalFound,
          current_sync_synced: totalSynced,
          current_sync_batch: batchNumber,
        })
        .eq("id", config.id);

      // Stop if we've fetched all fiches or this batch returned less than expected
      if (offset >= totalFound || (batchResult.processed || 0) < batchSize) {
        hasMore = false;
      }

      console.log(`Batch ${batchNumber} complete: ${batchResult.processed} synced, total progress: ${totalSynced}/${totalFound}`);
    }

    const syncResult = {
      total_found: totalFound,
      synced: totalSynced,
      created: totalCreated,
      updated: totalUpdated,
      batches: batchNumber,
    };

    console.log(`Sync complete: ${totalSynced} fiches synced in ${batchNumber} batches`);

    // Update config with results and mark as completed
    await supabase
      .from("apidae_sync_config")
      .update({
        last_sync_at: now.toISOString(),
        last_sync_result: syncResult,
        current_sync_status: "completed",
        current_sync_completed_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    // Log to sync history
    await supabase.from("apidae_sync_history").insert({
      sync_type: "automatic",
      status: "success",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      triggered_by: "make-webhook",
      fiches_synced: totalSynced,
      fiches_created: totalCreated,
      fiches_updated: totalUpdated,
      details: {
        batches: batchNumber,
        selection_ids: selectionIds,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation Apidae terminée: ${totalSynced} fiches synchronisées`,
        result: syncResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("trigger-apidae-sync error:", error);

    // Try to update sync status to error
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("apidae_sync_config")
          .update({
            current_sync_status: "error",
            current_sync_completed_at: new Date().toISOString(),
          })
          .neq("id", "");

        // Log error to history
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
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
