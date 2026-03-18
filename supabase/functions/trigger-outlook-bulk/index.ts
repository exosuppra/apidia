import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find the "Article Web" tag
    const { data: tags, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("name", "Article Web");

    if (tagError) throw tagError;
    if (!tags || tags.length === 0) {
      return new Response(
        JSON.stringify({ error: "Tag 'Article Web' introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const articleWebTagId = tags[0].id;

    // 2. Get all task_ids with this tag
    const { data: taskTags, error: ttError } = await supabase
      .from("task_tags")
      .select("task_id")
      .eq("tag_id", articleWebTagId);

    if (ttError) throw ttError;
    if (!taskTags || taskTags.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucune tâche avec le tag Article Web", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskIds = taskTags.map((tt) => tt.task_id);

    // 3. Fetch full task data
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, description, due_date, planning_id")
      .in("id", taskIds);

    if (tasksError) throw tasksError;

    // 4. Trigger webhook for each task
    const webhookUrl = Deno.env.get("MAKE_OUTLOOK_EVENT_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "MAKE_OUTLOOK_EVENT_WEBHOOK_URL non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { task_id: string; title: string; status: string }[] = [];

    for (const task of tasks || []) {
      try {
        // Compute start/end dates (same logic as create-outlook-event)
        let start_date = task.due_date || null;
        let end_date = task.due_date || null;

        if (task.due_date) {
          const d = new Date(task.due_date);
          const hours = d.getUTCHours();
          const minutes = d.getUTCMinutes();
          const isNoTime = (hours === 0 && minutes === 0) || (hours === 23 && minutes === 0) || (hours === 22 && minutes === 0);

          if (isNoTime) {
            let year = d.getUTCFullYear();
            let month = d.getUTCMonth();
            let day = d.getUTCDate();
            if (hours >= 22) {
              const nextDay = new Date(Date.UTC(year, month, day + 1));
              year = nextDay.getUTCFullYear();
              month = nextDay.getUTCMonth();
              day = nextDay.getUTCDate();
            }
            start_date = new Date(Date.UTC(year, month, day, 8, 0, 0)).toISOString();
            end_date = new Date(Date.UTC(year, month, day, 11, 30, 0)).toISOString();
          } else {
            start_date = d.toISOString();
            const endD = new Date(d.getTime() + 3.5 * 60 * 60 * 1000);
            end_date = endD.toISOString();
          }
        }

        const payload = {
          title: task.title,
          description: task.description || "",
          start_date,
          end_date,
          planning_name: "",
          task_id: task.id,
        };

        console.log(`Sending webhook for task: ${task.id} - ${task.title}`);

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        results.push({
          task_id: task.id,
          title: task.title,
          status: res.ok ? "success" : `error_${res.status}`,
        });

        // Small delay to avoid overwhelming Make.com
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        results.push({
          task_id: task.id,
          title: task.title,
          status: `error: ${err.message}`,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;

    return new Response(
      JSON.stringify({
        message: `${successCount}/${results.length} événements Outlook envoyés`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in trigger-outlook-bulk:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
