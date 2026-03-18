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

    const webhookPayload = {
      title,
      description: description || "",
      due_date: due_date || null,
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
