import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyAdminBody {
  email: string;
}

function normalizeEmail(str: string) {
  return (str || "").trim().toLowerCase();
}

// Liste des administrateurs autorisés
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

    const body = (await req.json()) as VerifyAdminBody;
    const email = normalizeEmail(body?.email);

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Vérifier si l'email est dans la liste des admins
    const isAdmin = ADMIN_EMAILS.includes(email);

    console.log(`Admin verification for ${email}: ${isAdmin}`);

    return new Response(JSON.stringify({ 
      isAdmin,
      email,
      permissions: isAdmin ? ["read", "write", "delete", "admin"] : []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("verify-admin error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});