import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminBody {
  email: string;
  password: string;
  secret?: string;
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
    const { email, password, secret } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email et mot de passe requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Simple protection - you can make this more secure
    const expectedSecret = Deno.env.get("ADMIN_CREATION_SECRET") || "create-admin-2024";
    if (secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Secret invalide" }), {
        status: 401,
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

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingAdmin) {
      return new Response(JSON.stringify({ error: "Un administrateur avec cet email existe déjà" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Hash password using PostgreSQL's crypt function
    const { data: hashedPassword, error: hashError } = await supabase
      .rpc("crypt", {
        password: password,
        salt: await supabase.rpc("gen_salt", { type: "bf" }).then(r => r.data)
      });

    if (hashError || !hashedPassword) {
      console.error("Password hashing error:", hashError);
      
      // Fallback: use a simple hash (not recommended for production)
      const encoder = new TextEncoder();
      const data = encoder.encode(password + email);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Insert admin user with simple hash
      const { data: adminUser, error: insertError } = await supabase
        .from("admin_users")
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: `simple:${hashHex}`
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Erreur lors de la création de l'administrateur" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Administrateur créé avec succès (hash simple)",
        admin: { id: adminUser.id, email: adminUser.email }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Insert admin user with proper hash
    const { data: adminUser, error: insertError } = await supabase
      .from("admin_users")
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: hashedPassword
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erreur lors de la création de l'administrateur" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Admin user created successfully:", adminUser.email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Administrateur créé avec succès",
      admin: { id: adminUser.id, email: adminUser.email }
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