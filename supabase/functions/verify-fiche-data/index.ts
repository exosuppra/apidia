import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FicheData {
  id: string;
  fiche_id: string;
  fiche_type: string;
  data: Record<string, any>;
}

interface VerificationResult {
  field_name: string;
  current_value: string | null;
  found_value: string | null;
  source_url: string;
  source_name: string;
  confidence_score: number;
}

// Extract contact info from APIDAE data structure
function extractApidaeData(data: Record<string, any>): Record<string, string | null> {
  const result: Record<string, string | null> = {
    telephone: null,
    email: null,
    site_web: null,
    adresse: null,
    nom: null,
    commune: null,
  };

  // Extract name
  result.nom = data.nom?.libelleFr || data.informations?.nom || null;

  // Extract commune
  result.commune = data.localisation?.adresse?.commune?.nom || 
                   data.localisation?.adresse?.codePostal || null;

  // Extract phone
  if (data.informations?.moyensCommunication) {
    const phone = data.informations.moyensCommunication.find(
      (m: any) => m.type?.libelleFr === 'Téléphone' || m.type?.id === 201
    );
    result.telephone = phone?.coordonnees?.fr || phone?.coordonnees || null;
  }

  // Extract email
  if (data.informations?.moyensCommunication) {
    const email = data.informations.moyensCommunication.find(
      (m: any) => m.type?.libelleFr === 'Mél' || m.type?.id === 204
    );
    result.email = email?.coordonnees?.fr || email?.coordonnees || null;
  }

  // Extract website
  if (data.informations?.moyensCommunication) {
    const website = data.informations.moyensCommunication.find(
      (m: any) => m.type?.libelleFr === 'Site web' || m.type?.id === 205
    );
    result.site_web = website?.coordonnees?.fr || website?.coordonnees || null;
  }

  // Extract address
  if (data.localisation?.adresse) {
    const addr = data.localisation.adresse;
    const parts = [
      addr.adresse1,
      addr.adresse2,
      addr.codePostal,
      addr.commune?.nom
    ].filter(Boolean);
    result.adresse = parts.join(', ') || null;
  }

  return result;
}

// Normalize phone numbers for comparison
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/[\s\.\-\(\)]/g, '').replace(/^\+33/, '0');
}

// Normalize URLs for comparison
function normalizeUrl(url: string | null): string {
  if (!url) return '';
  return url.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

// Compare values and determine if they differ significantly
function valuesMatch(current: string | null, found: string | null, fieldType: string): boolean {
  if (!current && !found) return true;
  if (!current || !found) return false;

  switch (fieldType) {
    case 'telephone':
      return normalizePhone(current) === normalizePhone(found);
    case 'site_web':
      return normalizeUrl(current) === normalizeUrl(found);
    case 'email':
      return current.toLowerCase().trim() === found.toLowerCase().trim();
    default:
      return current.toLowerCase().trim() === found.toLowerCase().trim();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fiche_id } = await req.json();

    if (!fiche_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'fiche_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch fiche data
    const { data: fiche, error: ficheError } = await supabase
      .from('fiches_data')
      .select('*')
      .eq('fiche_id', fiche_id)
      .single();

    if (ficheError || !fiche) {
      console.error('Fiche not found:', ficheError);
      return new Response(
        JSON.stringify({ success: false, error: 'Fiche not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apidaeData = extractApidaeData(fiche.data);
    console.log('APIDAE data extracted:', apidaeData);

    if (!apidaeData.nom) {
      return new Response(
        JSON.stringify({ success: false, error: 'Fiche has no name, cannot verify' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = `"${apidaeData.nom}" ${apidaeData.commune || ''}`;
    console.log('Searching for:', searchQuery);

    // Search using Firecrawl
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: {
          formats: ['markdown', 'extract'],
          extract: {
            schema: {
              type: 'object',
              properties: {
                telephone: { type: 'string', description: 'Phone number of the establishment' },
                email: { type: 'string', description: 'Email address of the establishment' },
                website: { type: 'string', description: 'Website URL of the establishment' },
                address: { type: 'string', description: 'Full address of the establishment' },
              }
            }
          }
        }
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Firecrawl search error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'Search failed: ' + (errorData.error || searchResponse.statusText) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchResults = await searchResponse.json();
    console.log('Search results count:', searchResults.data?.length || 0);

    const alerts: VerificationResult[] = [];

    // Process each search result
    for (const result of (searchResults.data || [])) {
      const sourceUrl = result.url;
      const sourceName = new URL(sourceUrl).hostname.replace('www.', '');
      const extractedData = result.extract || {};
      
      console.log(`Processing result from ${sourceName}:`, extractedData);

      // Check telephone
      if (extractedData.telephone && !valuesMatch(apidaeData.telephone, extractedData.telephone, 'telephone')) {
        alerts.push({
          field_name: 'telephone',
          current_value: apidaeData.telephone,
          found_value: extractedData.telephone,
          source_url: sourceUrl,
          source_name: sourceName,
          confidence_score: 0.7,
        });
      }

      // Check email
      if (extractedData.email && !valuesMatch(apidaeData.email, extractedData.email, 'email')) {
        alerts.push({
          field_name: 'email',
          current_value: apidaeData.email,
          found_value: extractedData.email,
          source_url: sourceUrl,
          source_name: sourceName,
          confidence_score: 0.8,
        });
      }

      // Check website
      if (extractedData.website && !valuesMatch(apidaeData.site_web, extractedData.website, 'site_web')) {
        alerts.push({
          field_name: 'site_web',
          current_value: apidaeData.site_web,
          found_value: extractedData.website,
          source_url: sourceUrl,
          source_name: sourceName,
          confidence_score: 0.6,
        });
      }
    }

    // Deduplicate alerts by field_name (keep highest confidence)
    const uniqueAlerts = Object.values(
      alerts.reduce((acc, alert) => {
        if (!acc[alert.field_name] || acc[alert.field_name].confidence_score < alert.confidence_score) {
          acc[alert.field_name] = alert;
        }
        return acc;
      }, {} as Record<string, VerificationResult>)
    );

    console.log(`Found ${uniqueAlerts.length} unique alerts`);

    // Insert alerts into database
    if (uniqueAlerts.length > 0) {
      const alertsToInsert = uniqueAlerts.map(alert => ({
        fiche_id: fiche_id,
        fiche_type: fiche.fiche_type,
        fiche_name: apidaeData.nom,
        ...alert,
      }));

      const { error: insertError } = await supabase
        .from('verification_alerts')
        .insert(alertsToInsert);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
      }
    }

    // Update fiche verification status
    const { error: updateError } = await supabase
      .from('fiches_data')
      .update({
        last_verified_at: new Date().toISOString(),
        verification_status: uniqueAlerts.length > 0 ? 'alerts_found' : 'verified',
      })
      .eq('fiche_id', fiche_id);

    if (updateError) {
      console.error('Error updating fiche status:', updateError);
    }

    // Log to fiche_history
    if (uniqueAlerts.length > 0) {
      const historyChanges = {
        fields: uniqueAlerts.map(alert => ({
          field: alert.field_name,
          label: alert.field_name === 'telephone' ? 'Téléphone' 
               : alert.field_name === 'email' ? 'Email' 
               : alert.field_name === 'site_web' ? 'Site web' 
               : alert.field_name,
          old_value: alert.current_value,
          new_value: alert.found_value,
        }))
      };

      const { error: historyError } = await supabase
        .from('fiche_history')
        .insert({
          fiche_id: fiche_id,
          fiche_uuid: fiche.id,
          action_type: 'verify',
          actor_type: 'system',
          actor_name: 'Apidia',
          changes: historyChanges,
          metadata: {
            alerts_count: uniqueAlerts.length,
            sources: [...new Set(uniqueAlerts.map(a => a.source_name))]
          }
        });

      if (historyError) {
        console.error('Error logging history:', historyError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fiche_id,
        fiche_name: apidaeData.nom,
        alerts_count: uniqueAlerts.length,
        alerts: uniqueAlerts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-fiche-data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
