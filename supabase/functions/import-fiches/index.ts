import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { fiches } = body;

    if (!fiches || !Array.isArray(fiches)) {
      return new Response(JSON.stringify({ error: "fiches array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Received ${fiches.length} fiches to import`);

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as { fiche_id: string; status: string; name?: string }[],
    };

    for (const fiche of fiches) {
      try {
        // Extract key fields from the fiche - use just the numeric ID
        const ficheId = String(fiche.id);
        const ficheType = fiche.type || "UNKNOWN";
        const ficheName = fiche.nom?.libelleFr || "Sans nom";
        const isPublished = fiche.state === "PUBLISHED";

        // Check if fiche already exists
        const { data: existing, error: checkError } = await supabase
          .from("fiches_data")
          .select("id, fiche_id")
          .eq("fiche_id", ficheId)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking fiche ${ficheId}:`, checkError.message);
          results.errors.push(`${ficheId}: ${checkError.message}`);
          results.details.push({ fiche_id: ficheId, status: "error", name: ficheName });
          continue;
        }

        if (existing) {
          console.log(`Fiche ${ficheId} already exists, skipping`);
          results.skipped++;
          results.details.push({ fiche_id: ficheId, status: "skipped", name: ficheName });
          continue;
        }

        // Insert new fiche
        const { data: insertedFiche, error: insertError } = await supabase
          .from("fiches_data")
          .insert({
            fiche_id: ficheId,
            fiche_type: ficheType,
            data: fiche,
            source: "json_import",
            is_published: isPublished,
            synced_to_sheets: false,
            verification_status: "not_verified",
            last_data_update_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error inserting fiche ${ficheId}:`, insertError.message);
          results.errors.push(`${ficheId}: ${insertError.message}`);
          results.details.push({ fiche_id: ficheId, status: "error", name: ficheName });
          continue;
        }

        console.log(`Successfully imported fiche ${ficheId}: ${ficheName}`);
        results.imported++;
        results.details.push({ fiche_id: ficheId, status: "imported", name: ficheName });

        // Log history for new fiche
        try {
          await supabase.from('fiche_history').insert({
            fiche_id: ficheId,
            fiche_uuid: insertedFiche?.id || null,
            action_type: 'import',
            actor_type: 'system',
            actor_name: 'Import JSON',
            metadata: {
              source: 'json_import',
              fiche_type: ficheType,
              fiche_name: ficheName
            }
          });
          console.log(`Logged import history for fiche ${ficheId}`);
        } catch (historyError) {
          console.error(`Failed to log history for fiche ${ficheId}:`, historyError);
        }

      } catch (ficheError: any) {
        const ficheId = fiche.identifier || fiche.id || "unknown";
        console.error(`Error processing fiche ${ficheId}:`, ficheError.message);
        results.errors.push(`${ficheId}: ${ficheError.message}`);
        results.details.push({ fiche_id: String(ficheId), status: "error" });
      }
    }

    console.log(`Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: any) {
    console.error("import-fiches error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
