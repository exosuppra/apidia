import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApidaeSyncConfig {
  id: string;
  is_enabled: boolean;
  schedule_type: "hourly" | "daily" | "weekly";
  sync_hour: number;
  selection_ids: number[];
  fiches_per_sync: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  last_sync_result: Record<string, unknown> | null;
}

function calculateNextRun(scheduleType: string, syncHour: number, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get sync configuration
    const { data: config, error: configError } = await supabase
      .from("apidae_sync_config")
      .select("*")
      .single();

    if (configError) {
      throw new Error(`Failed to load sync config: ${configError.message}`);
    }

    const syncConfig = config as ApidaeSyncConfig;

    // Check if sync is enabled
    if (!syncConfig.is_enabled) {
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: "Synchronisation automatique désactivée" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if it's time to run
    const now = new Date();
    if (syncConfig.next_sync_at) {
      const nextRun = new Date(syncConfig.next_sync_at);
      if (now < nextRun) {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: `Prochaine synchronisation prévue: ${nextRun.toISOString()}`,
            next_sync_at: syncConfig.next_sync_at,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("Running scheduled Apidae sync...");

    // Call fetch-apidae-fiches
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-apidae-fiches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        selectionIds: syncConfig.selection_ids || [],
        count: syncConfig.fiches_per_sync || 200,
        auto: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`fetch-apidae-fiches failed: ${errorText}`);
    }

    const syncResult = await response.json();

    // Update config with results
    const nextRunAt = calculateNextRun(syncConfig.schedule_type, syncConfig.sync_hour);
    
    await supabase
      .from("apidae_sync_config")
      .update({
        last_sync_at: now.toISOString(),
        next_sync_at: nextRunAt.toISOString(),
        last_sync_result: syncResult,
      })
      .eq("id", syncConfig.id);

    return new Response(
      JSON.stringify({
        success: true,
        result: syncResult,
        next_sync_at: nextRunAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("cron-apidae-sync error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
