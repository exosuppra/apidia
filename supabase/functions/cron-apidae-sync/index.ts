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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase credentials");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: config, error: configError } = await supabase
      .from("apidae_sync_config").select("*").single();
    if (configError) throw new Error(`Failed to load sync config: ${configError.message}`);

    // If interrupted, skip
    if (config.current_sync_status === "interrupted") {
      return json({ skipped: true, reason: "Sync was interrupted manually" });
    }

    // If not running and not forced, check schedule
    if (config.current_sync_status !== "running") {
      if (!config.is_enabled && !forceSync) {
        return json({ skipped: true, reason: "Synchronisation automatique désactivée" });
      }
      if (config.next_sync_at && !forceSync) {
        const nextRun = new Date(config.next_sync_at);
        if (new Date() < nextRun) {
          return json({ skipped: true, reason: `Prochaine sync: ${nextRun.toISOString()}`, next_sync_at: config.next_sync_at });
        }
      }
    }

    const selectionIds = config.selection_ids || [];
    const batchSize = config.fiches_per_sync || 200;

    let offset = 0;
    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let batchNumber = 0;
    let syncStartedAt = new Date().toISOString();

    if (config.current_sync_status === "running") {
      offset = config.current_sync_offset || 0;
      totalSynced = config.current_sync_synced || 0;
      batchNumber = config.current_sync_batch || 0;
      syncStartedAt = config.current_sync_started_at || syncStartedAt;
      console.log(`Resuming sync from offset ${offset}`);
    } else {
      console.log("Starting new Apidae sync...");
      await supabase.from("apidae_sync_config").update({
        current_sync_status: "running",
        current_sync_total: 0, current_sync_synced: 0,
        current_sync_batch: 0, current_sync_offset: 0,
        current_sync_started_at: syncStartedAt,
        current_sync_completed_at: null,
      }).eq("id", config.id);
    }

    let totalFound = 0;

    while (true) {
      if (Date.now() - t0 > TIME_BUDGET_MS) {
        console.log(`Time budget exceeded after ${batchNumber} batches`);
        break;
      }

      // Check interruption
      const { data: fresh } = await supabase
        .from("apidae_sync_config").select("current_sync_status").single();
      if (fresh?.current_sync_status === "interrupted") {
        return json({ interrupted: true });
      }

      batchNumber++;
      console.log(`Processing batch ${batchNumber} at offset ${offset}...`);

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
        await supabase.from("apidae_sync_config").update({
          current_sync_status: "error",
          current_sync_completed_at: new Date().toISOString(),
        }).eq("id", config.id);
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

      console.log(`Batch ${batchNumber}: ${batchSynced} synced, progress: ${totalSynced}/${totalFound}`);

      await supabase.from("apidae_sync_config").update({
        current_sync_total: totalFound,
        current_sync_synced: totalSynced,
        current_sync_batch: batchNumber,
        current_sync_offset: newOffset,
      }).eq("id", config.id);

      if (isComplete) {
        const syncResult = { total_found: totalFound, synced: totalSynced, created: totalCreated, updated: totalUpdated, batches: batchNumber };
        const scheduleType = config.schedule_type || "daily";
        const syncHour = config.sync_hour || 6;
        const nextRunAt = calculateNextRun(scheduleType, syncHour);

        await supabase.from("apidae_sync_config").update({
          last_sync_at: new Date().toISOString(),
          next_sync_at: nextRunAt.toISOString(),
          last_sync_result: syncResult,
          current_sync_status: "completed",
          current_sync_completed_at: new Date().toISOString(),
        }).eq("id", config.id);

        await supabase.from("apidae_sync_history").insert({
          sync_type: "automatic", status: "success",
          started_at: syncStartedAt,
          completed_at: new Date().toISOString(),
          triggered_by: "cron-apidae-sync",
          fiches_synced: totalSynced,
          fiches_created: totalCreated,
          fiches_updated: totalUpdated,
          details: { batches: batchNumber, selection_ids: selectionIds },
        });

        return json({ success: true, completed: true, result: syncResult, next_sync_at: nextRunAt.toISOString() });
      }

      offset = newOffset;
    }

    // Time budget exceeded
    return json({
      success: true, completed: false,
      batch: batchNumber, synced: totalSynced, total: totalFound,
    });

  } catch (error) {
    console.error("cron-apidae-sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateNextRun(scheduleType: string, syncHour: number): Date {
  const next = new Date();
  switch (scheduleType) {
    case "hourly": next.setHours(next.getHours() + 1, 0, 0, 0); break;
    case "weekly": next.setDate(next.getDate() + 7); next.setHours(syncHour, 0, 0, 0); break;
    default: next.setDate(next.getDate() + 1); next.setHours(syncHour, 0, 0, 0);
  }
  return next;
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
