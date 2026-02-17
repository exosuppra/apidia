import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIME_BUDGET_MS = 50_000; // 50s safety limit

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  console.log("Trigger Apidae sync called at:", startedAt);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase credentials");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: config, error: configError } = await supabase
      .from("apidae_sync_config").select("*").single();
    if (configError) throw new Error(`Failed to load sync config: ${configError.message}`);

    if (config.current_sync_status === "interrupted") {
      return json({ success: false, interrupted: true, message: "Sync interrompue" });
    }

    const selectionIds = config.selection_ids || [];
    const batchSize = config.fiches_per_sync || 200;

    let offset = 0;
    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let batchNumber = 0;
    let syncStartedAt = startedAt;

    if (config.current_sync_status === "running") {
      offset = config.current_sync_offset || 0;
      totalSynced = config.current_sync_synced || 0;
      batchNumber = config.current_sync_batch || 0;
      syncStartedAt = config.current_sync_started_at || startedAt;
      console.log(`Resuming sync from offset ${offset}, batch ${batchNumber}`);
    } else {
      console.log(`Starting new Apidae sync, batch size: ${batchSize}`);
      await supabase.from("apidae_sync_config").update({
        current_sync_status: "running",
        current_sync_total: 0,
        current_sync_synced: 0,
        current_sync_batch: 0,
        current_sync_offset: 0,
        current_sync_started_at: new Date().toISOString(),
        current_sync_completed_at: null,
      }).eq("id", config.id);
    }

    let totalFound = 0;
    let timedOut = false;

    // Internal loop — process batches until done or time budget exceeded
    while (true) {
      if (Date.now() - t0 > TIME_BUDGET_MS) {
        timedOut = true;
        console.log(`Time budget exceeded after ${batchNumber} batches`);
        break;
      }

      // Check for interruption
      const { data: fresh } = await supabase
        .from("apidae_sync_config").select("current_sync_status").single();
      if (fresh?.current_sync_status === "interrupted") {
        return json({ success: false, interrupted: true, message: "Sync interrompue" });
      }

      batchNumber++;
      console.log(`Fetching batch ${batchNumber} at offset ${offset}...`);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-apidae-fiches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ selectionIds, count: batchSize, first: offset, auto: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fetch-apidae-fiches failed at offset ${offset}: ${errorText}`);
      }

      const r = await response.json();
      totalFound = r.total || r.total_found || 0;
      const batchSynced = r.processed || r.synced || 0;
      totalSynced += batchSynced;
      totalCreated += r.inserted || r.created || 0;
      totalUpdated += r.updated || 0;

      const newOffset = offset + batchSize;
      const isComplete = newOffset >= totalFound || batchSynced < batchSize;

      console.log(`Batch ${batchNumber}: ${batchSynced} synced, progress: ${totalSynced}/${totalFound}, complete: ${isComplete}`);

      // Save progress after each batch
      await supabase.from("apidae_sync_config").update({
        current_sync_total: totalFound,
        current_sync_synced: totalSynced,
        current_sync_batch: batchNumber,
        current_sync_offset: newOffset,
      }).eq("id", config.id);

      if (isComplete) {
        // Finalize
        const syncResult = { total_found: totalFound, synced: totalSynced, created: totalCreated, updated: totalUpdated, batches: batchNumber };

        await supabase.from("apidae_sync_config").update({
          last_sync_at: new Date().toISOString(),
          last_sync_result: syncResult,
          current_sync_status: "completed",
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

        return json({
          success: true, completed: true,
          message: `Synchronisation terminée: ${totalSynced} fiches synchronisées`,
          result: syncResult,
        });
      }

      offset = newOffset;
    }

    // Time budget exceeded — save progress and return
    return json({
      success: true, completed: false,
      message: `${batchNumber} batches traités en ${Math.round((Date.now() - t0) / 1000)}s, ${totalSynced}/${totalFound} fiches. Rappeler pour continuer.`,
      batch: batchNumber, synced: totalSynced, total: totalFound,
    });

  } catch (error) {
    console.error("trigger-apidae-sync error:", error);
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await sb.from("apidae_sync_config").update({
          current_sync_status: "error",
          current_sync_completed_at: new Date().toISOString(),
        }).neq("id", "");
        await sb.from("apidae_sync_history").insert({
          sync_type: "automatic", status: "error",
          started_at: startedAt, completed_at: new Date().toISOString(),
          triggered_by: "make-webhook",
          error_message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (e) { console.error("Failed to update error status:", e); }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
