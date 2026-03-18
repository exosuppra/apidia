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
      // If time is midnight (00:00), set start to 9:00 and end to 12:30
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
        d.setUTCHours(9, 0, 0, 0);
        start_date = d.toISOString();
        const endD = new Date(d);
        endD.setUTCHours(12, 30, 0, 0);
        end_date = endD.toISOString();
      } else {
        // Use the provided time, end = start + 3.5h
        start_date = d.toISOString();
        const endD = new Date(d.getTime() + 3.5 * 60 * 60 * 1000);
        end_date = endD.toISOString();
      }
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
