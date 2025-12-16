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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("No token provided");
      return new Response(
        JSON.stringify({ error: "Token requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching planning with token:", token);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get planning by share token
    const { data: planning, error: planningError } = await supabase
      .from("editorial_plannings")
      .select("*")
      .eq("share_token", token)
      .eq("is_public", true)
      .single();

    if (planningError || !planning) {
      console.error("Planning not found or not public:", planningError);
      return new Response(
        JSON.stringify({ error: "Planning non trouvé ou non public" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found planning:", planning.id, planning.title);

    // Get tasks for this planning
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("planning_id", planning.id)
      .order("due_date", { ascending: true });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    console.log("Found", tasks?.length || 0, "tasks");

    // Get all tags
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .select("*");

    if (tagsError) {
      console.error("Error fetching tags:", tagsError);
      throw tagsError;
    }

    // Get task-tag relationships
    const { data: taskTags, error: taskTagsError } = await supabase
      .from("task_tags")
      .select("*");

    if (taskTagsError) {
      console.error("Error fetching task_tags:", taskTagsError);
      throw taskTagsError;
    }

    // Get comments for all tasks
    const taskIds = (tasks || []).map((t: any) => t.id);
    let comments: any[] = [];
    
    if (taskIds.length > 0) {
      const { data: commentsData, error: commentsError } = await supabase
        .from("task_comments")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
      } else {
        comments = commentsData || [];
      }
    }

    // Merge task tags and comments
    const tasksWithData = (tasks || []).map((task: any) => ({
      ...task,
      tags: (taskTags || [])
        .filter((tt: any) => tt.task_id === task.id)
        .map((tt: any) => (tags || []).find((tag: any) => tag.id === tt.tag_id))
        .filter(Boolean),
      comments: comments.filter((c: any) => c.task_id === task.id),
    }));

    console.log("Returning planning data successfully");

    return new Response(
      JSON.stringify({
        planning,
        tasks: tasksWithData,
        tags: tags || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-public-planning:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
