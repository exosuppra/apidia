import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  permissions?: string[];
}

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

    const body = (await req.json()) as CreateAdminBody;
    const { email, password, firstName, lastName, permissions } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email et mot de passe requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Creating admin user for email: ${email}`);

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(JSON.stringify({ error: `Erreur lors de la création de l'utilisateur: ${authError.message}` }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Aucun utilisateur créé" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Auth user created:", authData.user.id);

    // Add admin role to user_roles table
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "admin"
      });

    if (roleError) {
      console.error("Role insertion error:", roleError);
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return new Response(JSON.stringify({ error: `Erreur lors de l'attribution du rôle: ${roleError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Admin role assigned successfully");

    // Create profile with first and last name
    if (firstName || lastName) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Continue even if profile creation fails
      } else {
        console.log("Profile created successfully");
      }
    }

    // Add permissions if provided
    if (permissions && permissions.length > 0) {
      const { error: permError } = await supabase
        .from("admin_permissions")
        .insert(
          permissions.map(page_key => ({
            user_id: authData.user.id,
            page_key
          }))
        );

      if (permError) {
        console.error("Permissions insertion error:", permError);
        // Continue even if permissions fail
      } else {
        console.log("Permissions assigned successfully");
      }
    }

    // Call Make webhook for admin creation
    const makeWebhookUrl = Deno.env.get("MAKE_ADMIN_WEBHOOK_URL");
    if (makeWebhookUrl) {
      try {
        console.log("Calling Make webhook for new admin user");
        await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "admin_user_created",
            user: {
              id: authData.user.id,
              email: authData.user.email,
              firstName,
              lastName,
              createdAt: authData.user.created_at,
              temporaryPassword: password
            }
          })
        });
        console.log("Make webhook called successfully");
      } catch (webhookError) {
        console.error("Failed to call Make webhook:", webhookError);
        // Continue even if webhook fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Administrateur créé avec succès",
      admin: { 
        id: authData.user.id, 
        email: authData.user.email 
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("create-admin error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Erreur interne" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
