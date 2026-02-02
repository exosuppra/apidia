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
    const { taskId, validated, comment } = await req.json();

    // Validate input
    if (!taskId || typeof validated !== "boolean") {
      console.error("Missing required fields: taskId or validated");
      return new Response(
        JSON.stringify({ error: "Champs requis manquants (taskId, validated)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Handling validation response for task:", taskId, "Validated:", validated);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify task exists and is pending validation
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

    if (task.validation_status !== "pending") {
      console.warn("Task is not pending validation:", task.validation_status);
      return new Response(
        JSON.stringify({ error: "Cette tâche n'est pas en attente de validation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update task with validation response
    const newStatus = validated ? "validated" : "rejected";
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        validation_status: newStatus,
        validation_comment: comment || null,
        validation_responded_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateError) {
      console.error("Error updating task:", updateError);
      throw updateError;
    }

    console.log("Task validation updated:", taskId, "Status:", newStatus);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Tâche ${validated ? "validée" : "rejetée"} avec succès`,
        status: newStatus
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in handle-task-validation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
