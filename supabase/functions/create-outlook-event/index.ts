import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const webhookUrl = Deno.env.get("MAKE_OUTLOOK_EVENT_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("MAKE_OUTLOOK_EVENT_WEBHOOK_URL is not configured");
      return new Response(
        JSON.stringify({ error: "Le webhook Outlook n'est pas configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending Outlook event creation for task:", task_id, "Title:", title);

    // Calculate start_date and end_date from due_date
    let start_date = due_date || null;
    let end_date = due_date || null;

    if (due_date) {
      const d = new Date(due_date);
      const hours = d.getUTCHours();
      const minutes = d.getUTCMinutes();
      // Consider "no specific time" if midnight UTC OR close to midnight (timezone offset, e.g. 23:00 UTC = 00:00 CET)
      const isNoTime = (hours === 0 && minutes === 0) || (hours === 23 && minutes === 0) || (hours === 22 && minutes === 0);
      
      if (isNoTime) {
        // Extract the local date: if UTC hour is 22 or 23, the local date is the next day
        let year = d.getUTCFullYear();
        let month = d.getUTCMonth();
        let day = d.getUTCDate();
        if (hours >= 22) {
          // Local date is next day
          const nextDay = new Date(Date.UTC(year, month, day + 1));
          year = nextDay.getUTCFullYear();
          month = nextDay.getUTCMonth();
          day = nextDay.getUTCDate();
        }
        // Set start 9:00 and end 12:30 in Europe/Paris (UTC+1 winter / UTC+2 summer)
        // Use fixed UTC+1 offset as approximation for France
        start_date = new Date(Date.UTC(year, month, day, 8, 0, 0)).toISOString(); // 9h Paris = 8h UTC
        end_date = new Date(Date.UTC(year, month, day, 11, 30, 0)).toISOString(); // 12h30 Paris = 11h30 UTC
      } else {
        // Specific time provided, use as-is with 3.5h duration
        start_date = d.toISOString();
        const endD = new Date(d.getTime() + 3.5 * 60 * 60 * 1000);
        end_date = endD.toISOString();
      }
      
      console.log("Computed start_date:", start_date, "end_date:", end_date, "from due_date:", due_date);
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

    console.log("Outlook event creation webhook sent successfully for task:", task_id);

    return new Response(
      JSON.stringify({ success: true, message: "Événement Outlook créé via Make" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-outlook-event:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
