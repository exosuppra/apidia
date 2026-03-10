import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, title, description, dueDate, target } = await req.json();

    // Validate input
    if (!taskId || !title) {
      console.error("Missing required fields: taskId or title");
      return new Response(
        JSON.stringify({ error: "Champs requis manquants (taskId, title)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Requesting validation for task:", taskId, "Title:", title, "Target:", target || "generic");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Select webhook based on target
    let webhookUrl: string | undefined;
    if (target === "laura") {
      webhookUrl = Deno.env.get("MAKE_VALIDATION_LAURA_WEBHOOK_URL");
    } else if (target === "marie") {
      webhookUrl = Deno.env.get("MAKE_VALIDATION_MARIE_WEBHOOK_URL");
    } else {
      webhookUrl = Deno.env.get("MAKE_TASK_VALIDATION_WEBHOOK_URL");
    }

    if (!webhookUrl) {
      console.error("Webhook URL not configured for target:", target || "generic");
      return new Response(
        JSON.stringify({ error: "Le webhook de validation n'est pas configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify task exists
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, validation_status")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Task not found:", taskError);
      return new Response(
        JSON.stringify({ error: "Tâche non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow re-requesting validation even if pending
    if (task.validation_status === "pending") {
      console.log("Re-requesting validation for task:", taskId);
    }

    // Fetch attachments for this task
    let attachmentUrls: { name: string; url: string }[] = [];
    try {
      const { data: attachments } = await supabase
        .from("task_attachments")
        .select("file_name, file_path")
        .eq("task_id", taskId);

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const { data: signedData, error: signError } = await supabase.storage
            .from("task-attachments")
            .createSignedUrl(att.file_path, 60 * 60 * 24 * 7); // 7 days

          if (!signError && signedData?.signedUrl) {
            attachmentUrls.push({ name: att.file_name, url: signedData.signedUrl });
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch attachments:", e);
    }

    // Send to Make webhook - flat fields for easy Make.com mapping
    const webhookPayload: Record<string, unknown> = {
      taskId,
      title,
      description: description || "",
      dueDate: dueDate || null,
      attachments_count: attachmentUrls.length,
    };

    // Add each attachment as separate fields: attachment1_name, attachment1_url, etc.
    for (let i = 0; i < attachmentUrls.length; i++) {
      webhookPayload[`attachment${i + 1}_name`] = attachmentUrls[i].name;
      webhookPayload[`attachment${i + 1}_url`] = attachmentUrls[i].url;
    }

    console.log("Sending to Make webhook:", webhookPayload);

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Make webhook error:", errorText);
      throw new Error(`Erreur du webhook Make: ${webhookResponse.status}`);
    }

    // Update task validation status to pending
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        validation_status: "pending",
        validation_requested_at: new Date().toISOString(),
        validation_comment: null,
        validation_responded_at: null,
        validation_target: target || null,
      })
      .eq("id", taskId);

    if (updateError) {
      console.error("Error updating task:", updateError);
      throw updateError;
    }

    console.log("Validation request sent successfully for task:", taskId);

    return new Response(
      JSON.stringify({ success: true, message: "Demande de validation envoyée" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in request-task-validation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
