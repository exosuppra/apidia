import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestUpdateBody {
  id: string;
  email: string;
  changes: Record<string, unknown>;
  original?: Record<string, unknown>;
}

// Validation constants
const MAX_ID_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

function validateInput(id: string, email: string, changes: unknown): string | null {
  if (!id || id.length === 0) return "ID manquant";
  if (id.length > MAX_ID_LENGTH) return `ID trop long (max ${MAX_ID_LENGTH} caractères)`;
  
  if (!email || email.length === 0) return "Email manquant";
  if (email.length > MAX_EMAIL_LENGTH) return `Email trop long (max ${MAX_EMAIL_LENGTH} caractères)`;
  if (!EMAIL_REGEX.test(email)) return "Format d'email invalide";
  
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return "Changes doit être un objet";
  }
  
  if (Object.keys(changes).length === 0) {
    return "Aucune modification fournie";
  }
  
  return null;
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

    // Check payload size
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(JSON.stringify({ error: "Payload trop volumineux" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as RequestUpdateBody;
    const id = (body?.id || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const changes = body?.changes || {};

    // Validate input
    const validationError = validateInput(id, email, changes);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store request in database
    const { data: requestData, error: requestError } = await supabase
      .from('user_requests')
      .insert({
        user_email: email,
        fiche_id: id,
        original_data: body?.original || null,
        requested_changes: changes,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error storing request:', requestError);
      throw requestError;
    }

    // Log the action
    await supabase
      .from('user_action_logs')
      .insert({
        user_email: email,
        action_type: 'request_update',
        action_details: { fiche_id: id, request_id: requestData.id },
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
      });

    return new Response(JSON.stringify({ 
      ok: true, 
      request_id: requestData.id,
      message: "Demande enregistrée et en attente de validation" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("request-update error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
