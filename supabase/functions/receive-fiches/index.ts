import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FichePayload {
  fiche_type: string;
  fiche_id: string;
  [key: string]: unknown;
}

interface RequestBody {
  fiches: FichePayload[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: RequestBody = await req.json();
    console.log("Received fiches payload:", JSON.stringify(body, null, 2));

    // Validate payload
    if (!body.fiches || !Array.isArray(body.fiches)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: 'fiches' array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for insert
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      inserted: 0,
      updated: 0,
      errors: [] as { fiche_id: string; error: string }[],
    };

    // Process each fiche
    for (const fiche of body.fiches) {
      if (!fiche.fiche_type || !fiche.fiche_id) {
        results.errors.push({
          fiche_id: fiche.fiche_id || "unknown",
          error: "Missing fiche_type or fiche_id",
        });
        continue;
      }

      // Extract fiche_type and fiche_id, rest goes to data
      const { fiche_type, fiche_id, ...data } = fiche;

      // Check if exists
      const { data: existing } = await supabase
        .from("fiches_data")
        .select("id")
        .eq("fiche_type", fiche_type)
        .eq("fiche_id", fiche_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("fiches_data")
          .update({
            data,
            synced_to_sheets: false,
            source: "make_webhook",
          })
          .eq("fiche_type", fiche_type)
          .eq("fiche_id", fiche_id);

        if (error) {
          console.error("Error updating fiche:", error);
          results.errors.push({ fiche_id, error: error.message });
        } else {
          results.updated++;
          console.log(`Updated fiche: ${fiche_type}/${fiche_id}`);
        }
      } else {
        // Insert new
        const { error } = await supabase.from("fiches_data").insert({
          fiche_type,
          fiche_id,
          data,
          synced_to_sheets: false,
          source: "make_webhook",
        });

        if (error) {
          console.error("Error inserting fiche:", error);
          results.errors.push({ fiche_id, error: error.message });
        } else {
          results.inserted++;
          console.log(`Inserted fiche: ${fiche_type}/${fiche_id}`);
        }
      }
    }

    console.log("Processing complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${body.fiches.length} fiches`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
