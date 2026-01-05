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

// APIDAE native format
interface ApidaeFiche {
  type: string;
  id: number | string;
  [key: string]: unknown;
}

// APIDAE notification format (temps réel)
interface ApidaeNotification {
  referenceIds: number[];
  operation: string;
  projectId: number;
  timestamp: number;
}

type RequestBody = { fiches: FichePayload[] } | ApidaeFiche | ApidaeFiche[] | ApidaeNotification;

function isApidaeNotification(body: unknown): body is ApidaeNotification {
  return (
    body !== null &&
    typeof body === 'object' &&
    'operation' in body &&
    'referenceIds' in body &&
    Array.isArray((body as ApidaeNotification).referenceIds)
  );
}

function normalizeToFiches(body: unknown): FichePayload[] {
  // Format 1: Already wrapped with "fiches" array
  if (body && typeof body === 'object' && 'fiches' in body && Array.isArray((body as { fiches: unknown[] }).fiches)) {
    console.log("Detected format: fiches wrapper");
    return (body as { fiches: FichePayload[] }).fiches;
  }
  
  // Format 2: Single APIDAE object (has "type" and "id")
  if (body && typeof body === 'object' && 'type' in body && 'id' in body) {
    const apidae = body as ApidaeFiche;
    console.log(`Detected format: single APIDAE object (type: ${apidae.type}, id: ${apidae.id})`);
    const { type, id, ...rest } = apidae;
    return [{
      fiche_type: type,
      fiche_id: String(id),
      ...rest
    }];
  }
  
  // Format 3: Array of APIDAE objects
  if (Array.isArray(body) && body.length > 0 && body[0].type && body[0].id) {
    console.log(`Detected format: array of ${body.length} APIDAE objects`);
    return body.map((item: ApidaeFiche) => {
      const { type, id, ...rest } = item;
      return {
        fiche_type: type,
        fiche_id: String(id),
        ...rest
      };
    });
  }
  
  return [];
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
    const body = await req.json();
    console.log("Received payload:", JSON.stringify(body, null, 2).substring(0, 500) + "...");

    // Initialize Supabase client with service role for insert/delete
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle APIDAE notification (deletion, etc.)
    if (isApidaeNotification(body)) {
      console.log(`Detected APIDAE notification: operation=${body.operation}, referenceIds=${body.referenceIds.join(', ')}`);
      
      if (body.operation === "DELETE_OBJET_TOURISTIQUE") {
        const deleteResults = {
          deleted: 0,
          notFound: 0,
          errors: [] as { fiche_id: string; error: string }[],
        };

        for (const refId of body.referenceIds) {
          const ficheId = String(refId);
          
          // Check if exists
          const { data: existing } = await supabase
            .from("fiches_data")
            .select("id")
            .eq("fiche_id", ficheId)
            .maybeSingle();

          if (!existing) {
            deleteResults.notFound++;
            console.log(`Fiche not found for deletion: ${ficheId}`);
            continue;
          }

          // Delete the fiche
          const { error } = await supabase
            .from("fiches_data")
            .delete()
            .eq("fiche_id", ficheId);

          if (error) {
            console.error(`Error deleting fiche ${ficheId}:`, error);
            deleteResults.errors.push({ fiche_id: ficheId, error: error.message });
          } else {
            deleteResults.deleted++;
            console.log(`Deleted fiche: ${ficheId}`);
          }
        }

        console.log("Deletion complete:", deleteResults);

        return new Response(
          JSON.stringify({
            success: true,
            operation: body.operation,
            message: `Processed ${body.referenceIds.length} deletion(s)`,
            results: deleteResults,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Other operations (could be extended later)
      return new Response(
        JSON.stringify({
          success: true,
          operation: body.operation,
          message: `Notification received but operation ${body.operation} not handled`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize to fiches array (supports multiple formats)
    const fichesToProcess = normalizeToFiches(body);
    
    if (fichesToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid payload format", 
          hint: "Expected: { fiches: [...] } OR single APIDAE object with 'type' and 'id' OR array of APIDAE objects OR APIDAE notification with 'operation' and 'referenceIds'" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Processing ${fichesToProcess.length} fiche(s)`);

    const results = {
      inserted: 0,
      updated: 0,
      errors: [] as { fiche_id: string; error: string }[],
    };

    // Process each fiche
    for (const fiche of fichesToProcess) {
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
        message: `Processed ${fichesToProcess.length} fiche(s)`,
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
