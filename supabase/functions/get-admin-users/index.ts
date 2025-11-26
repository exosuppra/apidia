import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token to verify they're admin
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin client to get user details
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get all admin user IDs
    const { data: adminRoles, error: adminRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRolesError) throw adminRolesError;

    const userIds = adminRoles.map(r => r.user_id);

    // Get user details and permissions
    const usersWithPermissions = await Promise.all(
      userIds.map(async (userId) => {
        const { data: { user: adminUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !adminUser) {
          console.error(`Error fetching user ${userId}:`, error);
          return null;
        }

        // Get permissions
        const { data: perms } = await supabaseAdmin
          .from('admin_permissions')
          .select('page_key')
          .eq('user_id', userId);

        // Get profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        return {
          id: adminUser.id,
          email: adminUser.email || '',
          created_at: adminUser.created_at,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          permissions: perms?.map(p => p.page_key) || []
        };
      })
    );

    const users = usersWithPermissions.filter(u => u !== null);

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("get-admin-users error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
