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

interface MediaInfo {
  original_url: string;
  stored_url: string;
  type: string;
  nom?: string;
  legende?: string;
  copyright?: string;
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

// Extract media URLs from APIDAE data
function extractMediaUrls(data: Record<string, unknown>): Array<{ url: string; type: string; nom?: string; legende?: string; copyright?: string }> {
  const medias: Array<{ url: string; type: string; nom?: string; legende?: string; copyright?: string }> = [];
  
  // Check illustrations array
  const illustrations = data.illustrations as Array<Record<string, unknown>> | undefined;
  if (illustrations && Array.isArray(illustrations)) {
    for (const illus of illustrations) {
      const traductionFichiers = illus.traductionFichiers as Array<Record<string, unknown>> | undefined;
      if (traductionFichiers && Array.isArray(traductionFichiers)) {
        for (const trad of traductionFichiers) {
          const url = trad.url as string;
          if (url) {
            medias.push({
              url,
              type: 'illustration',
              nom: (illus.nom as Record<string, string>)?.libelleFr || '',
              legende: (illus.legende as Record<string, string>)?.libelleFr || '',
              copyright: (illus.copyright as Record<string, string>)?.libelleFr || ''
            });
          }
        }
      }
      // Also check direct link field
      const link = illus.link as string;
      if (link) {
        medias.push({
          url: link,
          type: 'illustration',
          nom: (illus.nom as Record<string, string>)?.libelleFr || '',
          legende: (illus.legende as Record<string, string>)?.libelleFr || '',
          copyright: (illus.copyright as Record<string, string>)?.libelleFr || ''
        });
      }
    }
  }
  
  // Check multimedias array
  const multimedias = data.multimedias as Array<Record<string, unknown>> | undefined;
  if (multimedias && Array.isArray(multimedias)) {
    for (const media of multimedias) {
      const traductionFichiers = media.traductionFichiers as Array<Record<string, unknown>> | undefined;
      if (traductionFichiers && Array.isArray(traductionFichiers)) {
        for (const trad of traductionFichiers) {
          const url = trad.url as string;
          if (url) {
            medias.push({
              url,
              type: 'multimedia',
              nom: (media.nom as Record<string, string>)?.libelleFr || '',
              legende: (media.legende as Record<string, string>)?.libelleFr || '',
              copyright: (media.copyright as Record<string, string>)?.libelleFr || ''
            });
          }
        }
      }
    }
  }
  
  return medias;
}

// Download and store media to Supabase Storage
async function downloadAndStoreMedia(
  supabase: ReturnType<typeof createClient>,
  ficheId: string,
  mediaUrl: string,
  mediaIndex: number
): Promise<string | null> {
  try {
    console.log(`Downloading media ${mediaIndex} for fiche ${ficheId}: ${mediaUrl}`);
    
    // Download the file
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      console.error(`Failed to download media: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Determine file extension
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('svg')) extension = 'svg';
    else if (contentType.includes('pdf')) extension = 'pdf';
    
    // Create file path
    const fileName = `${ficheId}/${mediaIndex}.${extension}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('fiche-media')
      .upload(fileName, uint8Array, {
        contentType,
        upsert: true
      });
    
    if (uploadError) {
      console.error(`Failed to upload media: ${uploadError.message}`);
      return null;
    }
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('fiche-media')
      .getPublicUrl(fileName);
    
    console.log(`Stored media at: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error(`Error downloading/storing media: ${error}`);
    return null;
  }
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

          // Delete associated media from storage
          const { data: files } = await supabase.storage
            .from('fiche-media')
            .list(ficheId);
          
          if (files && files.length > 0) {
            const filePaths = files.map(f => `${ficheId}/${f.name}`);
            await supabase.storage.from('fiche-media').remove(filePaths);
            console.log(`Deleted ${files.length} media files for fiche ${ficheId}`);
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
      mediaDownloaded: 0,
      mediaErrors: 0,
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

      // Extract and download media
      const mediaUrls = extractMediaUrls(data as Record<string, unknown>);
      const storedMedia: MediaInfo[] = [];
      
      if (mediaUrls.length > 0) {
        console.log(`Found ${mediaUrls.length} media items for fiche ${fiche_id}`);
        
        for (let i = 0; i < mediaUrls.length; i++) {
          const media = mediaUrls[i];
          const storedUrl = await downloadAndStoreMedia(supabase, fiche_id, media.url, i);
          
          if (storedUrl) {
            storedMedia.push({
              original_url: media.url,
              stored_url: storedUrl,
              type: media.type,
              nom: media.nom,
              legende: media.legende,
              copyright: media.copyright
            });
            results.mediaDownloaded++;
          } else {
            results.mediaErrors++;
          }
        }
      }

      // Add stored media URLs to data
      const enrichedData = {
        ...data,
        _stored_media: storedMedia
      };

      // Check if exists
      const { data: existing } = await supabase
        .from("fiches_data")
        .select("id")
        .eq("fiche_type", fiche_type)
        .eq("fiche_id", fiche_id)
        .maybeSingle();

      if (existing) {
        // Get current data for history comparison
        const { data: currentFiche } = await supabase
          .from("fiches_data")
          .select("data")
          .eq("fiche_type", fiche_type)
          .eq("fiche_id", fiche_id)
          .single();

        // Update existing
        const { error } = await supabase
          .from("fiches_data")
          .update({
            data: enrichedData,
            synced_to_sheets: false,
            source: "make_webhook",
            last_data_update_at: new Date().toISOString(),
          })
          .eq("fiche_type", fiche_type)
          .eq("fiche_id", fiche_id);

        if (error) {
          console.error("Error updating fiche:", error);
          results.errors.push({ fiche_id, error: error.message });
        } else {
          results.updated++;
          console.log(`Updated fiche: ${fiche_type}/${fiche_id} with ${storedMedia.length} media`);
          
          // Log history for update
          const ficheName = (data as Record<string, unknown>).nom 
            ? ((data as Record<string, unknown>).nom as Record<string, string>)?.libelleFr || 'Sans nom'
            : 'Sans nom';
          
          try {
            await supabase.from('fiche_history').insert({
              fiche_id: fiche_id,
              fiche_uuid: existing.id,
              action_type: 'update',
              actor_type: 'system',
              actor_name: 'Webhook Make',
              changes: {
                previous_data: currentFiche?.data || null,
                new_data: enrichedData
              },
              metadata: {
                source: 'make_webhook',
                fiche_type: fiche_type,
                fiche_name: ficheName,
                media_count: storedMedia.length
              }
            });
            console.log(`Logged update history for fiche ${fiche_id}`);
          } catch (historyError) {
            console.error(`Failed to log update history for fiche ${fiche_id}:`, historyError);
          }
        }
      } else {
        // Insert new
        const { data: insertedFiche, error } = await supabase.from("fiches_data").insert({
          fiche_type,
          fiche_id,
          data: enrichedData,
          synced_to_sheets: false,
          source: "make_webhook",
        }).select('id').single();

        if (error) {
          console.error("Error inserting fiche:", error);
          results.errors.push({ fiche_id, error: error.message });
        } else {
          results.inserted++;
          console.log(`Inserted fiche: ${fiche_type}/${fiche_id} with ${storedMedia.length} media`);
          
          // Log history for new fiche
          const ficheName = (data as Record<string, unknown>).nom 
            ? ((data as Record<string, unknown>).nom as Record<string, string>)?.libelleFr || 'Sans nom'
            : 'Sans nom';
          
          try {
            await supabase.from('fiche_history').insert({
              fiche_id: fiche_id,
              fiche_uuid: insertedFiche?.id || null,
              action_type: 'import',
              actor_type: 'system',
              actor_name: 'Webhook Make',
              metadata: {
                source: 'make_webhook',
                fiche_type: fiche_type,
                fiche_name: ficheName,
                media_count: storedMedia.length
              }
            });
            console.log(`Logged import history for fiche ${fiche_id}`);
          } catch (historyError) {
            console.error(`Failed to log history for fiche ${fiche_id}:`, historyError);
          }
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
