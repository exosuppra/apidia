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
    const { taskId, authorName, authorEmail, content, shareToken } = await req.json();

    // Validate input
    if (!taskId || !authorName || !content || !shareToken) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content length
    if (content.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Le commentaire est trop long (max 2000 caractères)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate author name length
    if (authorName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Le nom est trop long (max 100 caractères)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Adding comment for task:", taskId, "by:", authorName);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the share token is valid and the task belongs to a public planning
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, planning_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Task not found:", taskError);
      return new Response(
        JSON.stringify({ error: "Tâche non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the planning is public with the given token
    const { data: planning, error: planningError } = await supabase
      .from("editorial_plannings")
      .select("id, share_token, is_public")
      .eq("id", task.planning_id)
      .eq("share_token", shareToken)
      .eq("is_public", true)
      .single();

    if (planningError || !planning) {
      console.error("Planning not public or token mismatch:", planningError);
      return new Response(
        JSON.stringify({ error: "Accès non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the comment
    const { data: comment, error: insertError } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        author_name: authorName.trim(),
        author_email: authorEmail?.trim() || null,
        content: content.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      throw insertError;
    }

    console.log("Comment added successfully:", comment.id);

    return new Response(
      JSON.stringify({ comment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in add-task-comment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
