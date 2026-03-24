import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, due_date, planning_name, task_id } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Le titre est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = Deno.env.get("MAKE_OUTLOOK_MOVE_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("MAKE_OUTLOOK_MOVE_WEBHOOK_URL is not configured");
      return new Response(
        JSON.stringify({ error: "Le webhook de déplacement Outlook n'est pas configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Moving Outlook event for task:", task_id, "Title:", title);

    let start_date = due_date || null;
    let end_date = due_date || null;

    if (due_date) {
      const d = new Date(due_date);
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

      console.log("Computed start_date:", start_date, "end_date:", end_date);
    }

    const webhookPayload = {
      title,
      description: description || "",
      start_date,
      end_date,
      planning_name: planning_name || "",
      task_id: task_id || "",
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Make webhook error:", errorText);
      throw new Error(`Erreur du webhook Make: ${webhookResponse.status}`);
    }

    console.log("Outlook event move webhook sent successfully for task:", task_id);

    return new Response(
      JSON.stringify({ success: true, message: "Événement Outlook déplacé via Make" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in move-outlook-event:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
