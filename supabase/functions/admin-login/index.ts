import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminLoginBody {
  email: string;
  password: string;
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

    const body = (await req.json()) as AdminLoginBody;
    const { email, password } = body;

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

    console.log(`Attempting admin login for email: ${email}`);

    // Check if admin user exists - service role bypasses RLS automatically
    const { data: adminUser, error: dbError } = await supabase
      .from("admin_users")
      .select("id, email, password_hash")
      .eq("email", email.toLowerCase().trim())
      .single();

    console.log("Admin user query result:", { adminUser: !!adminUser, error: dbError });

    if (dbError || !adminUser) {
      console.log("Admin user not found or DB error:", dbError);
      return new Response(JSON.stringify({ error: "Identifiants administrateur invalides" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify password using PostgreSQL's crypt function
    console.log("Attempting password verification...");
    const { data: passwordCheck, error: pwError } = await supabase
      .rpc("verify_admin_password", {
        input_password: password,
        stored_hash: adminUser.password_hash
      });

    console.log("Password verification result:", { passwordCheck, error: pwError });

    if (pwError) {
      console.error("Password verification function error:", pwError);
      return new Response(JSON.stringify({ error: "Erreur de vérification du mot de passe" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!passwordCheck) {
      console.log("Password verification failed");
      return new Response(JSON.stringify({ error: "Identifiants administrateur invalides" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create a session token for the admin (you can customize this)
    const sessionToken = crypto.randomUUID();
    
    return new Response(JSON.stringify({ 
      success: true, 
      admin: {
        id: adminUser.id,
        email: adminUser.email
      },
      sessionToken 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("admin-login error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Erreur interne" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});