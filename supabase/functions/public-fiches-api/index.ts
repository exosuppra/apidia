import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow GET requests
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check API key authentication
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("PUBLIC_API_KEY");
    
    if (!expectedApiKey) {
      console.error("PUBLIC_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid or missing API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse URL parameters
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Pagination
    const page = parseInt(params.get("page") || "1");
    const limit = Math.min(parseInt(params.get("limit") || "100"), 500); // Max 500 per request
    const offset = (page - 1) * limit;
    
    // Filters
    const source = params.get("source"); // 'apidae' or 'make_webhook'
    const ficheType = params.get("type"); // Type de fiche
    const publishedOnly = params.get("published") !== "false"; // Default: only published
    const updatedSince = params.get("updated_since"); // ISO date string
    const ficheId = params.get("fiche_id"); // Single fiche by ID

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from("fiches_data")
      .select("fiche_id, fiche_type, source, data, is_published, updated_at, created_at", { count: "exact" });

    // Apply filters
    if (ficheId) {
      query = query.eq("fiche_id", ficheId);
    }
    if (publishedOnly) {
      query = query.eq("is_published", true);
    }
    if (source) {
      query = query.eq("source", source);
    }
    if (ficheType) {
      query = query.eq("fiche_type", ficheType);
    }
    if (updatedSince) {
      query = query.gte("updated_at", updatedSince);
    }

    // Apply pagination and ordering
    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: fiches, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ error: "Database error", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build response with pagination info
    const totalPages = Math.ceil((count || 0) / limit);
    
    const response = {
      success: true,
      data: fiches,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        source: source || "all",
        type: ficheType || "all",
        publishedOnly,
        updatedSince: updatedSince || null,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
