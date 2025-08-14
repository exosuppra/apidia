import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminGetHistoryBody {
  adminEmail: string;
  limit?: number;
  offset?: number;
  actionType?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}

function normalizeEmail(str: string) {
  return (str || "").trim().toLowerCase();
}

const ADMIN_EMAILS = [
  "admin@apidia.com",
  "direction@apidia.com",
  "it@apidia.com"
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as AdminGetHistoryBody;
    const adminEmail = normalizeEmail(body?.adminEmail);
    const { 
      limit = 50, 
      offset = 0, 
      actionType, 
      targetType, 
      startDate, 
      endDate 
    } = body;

    if (!adminEmail) {
      return new Response(JSON.stringify({ error: "Missing admin email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Vérifier les droits admin
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Construire la requête avec les filtres
    let adminActionsQuery = supabase
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    let userRequestsQuery = supabase
      .from("user_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Appliquer les filtres
    if (actionType) {
      adminActionsQuery = adminActionsQuery.eq("action_type", actionType);
    }
    if (targetType) {
      adminActionsQuery = adminActionsQuery.eq("target_type", targetType);
    }
    if (startDate) {
      adminActionsQuery = adminActionsQuery.gte("created_at", startDate);
      userRequestsQuery = userRequestsQuery.gte("created_at", startDate);
    }
    if (endDate) {
      adminActionsQuery = adminActionsQuery.lte("created_at", endDate);
      userRequestsQuery = userRequestsQuery.lte("created_at", endDate);
    }

    const [adminActionsResult, userRequestsResult] = await Promise.all([
      adminActionsQuery,
      userRequestsQuery
    ]);

    if (adminActionsResult.error) {
      throw new Error("Error fetching admin actions: " + adminActionsResult.error.message);
    }
    if (userRequestsResult.error) {
      throw new Error("Error fetching user requests: " + userRequestsResult.error.message);
    }

    // Combiner et trier par date
    const allActions = [
      ...adminActionsResult.data.map(action => ({ ...action, source: "admin_action" })),
      ...userRequestsResult.data.map(request => ({ ...request, source: "user_request" }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Obtenir les statistiques
    const { data: stats } = await supabase
      .from("admin_actions")
      .select("action_type")
      .eq("admin_email", adminEmail);

    const actionCounts = stats?.reduce((acc: Record<string, number>, action) => {
      acc[action.action_type] = (acc[action.action_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Log de cette action
    await supabase.from("admin_actions").insert({
      admin_email: adminEmail,
      action_type: "view",
      target_type: "history",
      description: `Admin ${adminEmail} viewed history`,
      metadata: { 
        filters: { actionType, targetType, startDate, endDate },
        resultCount: allActions.length
      }
    });

    console.log(`Admin ${adminEmail} viewed history with ${allActions.length} results`);

    return new Response(JSON.stringify({ 
      data: allActions,
      stats: {
        totalResults: allActions.length,
        actionCounts,
        adminActions: adminActionsResult.data.length,
        userRequests: userRequestsResult.data.length
      },
      pagination: {
        limit,
        offset,
        hasMore: allActions.length === limit
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("admin-get-history error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});