import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyCorrectionRequest {
  alert_id: string;
  actor_id?: string;
  actor_name: string;
}

// Field mapping: alert field_name to JSON path in APIDAE structure
const fieldMappings: Record<string, { path: string[]; type: number | null }> = {
  telephone: { path: ['informations', 'moyensCommunication'], type: 201 },
  email: { path: ['informations', 'moyensCommunication'], type: 204 },
  site_web: { path: ['informations', 'moyensCommunication'], type: 205 },
  adresse: { path: ['localisation', 'adresse'], type: null },
};

// Parse a full address string into components
function parseAddress(fullAddress: string): { adresse1: string | null; codePostal: string | null; commune: string | null } {
  // Extract postal code (5 digits)
  const postalMatch = fullAddress.match(/\b(\d{5})\b/);
  const codePostal = postalMatch ? postalMatch[1] : null;
  
  let commune = null;
  let adresse1 = fullAddress;
  
  if (postalMatch) {
    // Extract commune (after postal code)
    const afterPostal = fullAddress.substring(fullAddress.indexOf(postalMatch[0]) + 5).trim();
    commune = afterPostal.replace(/^[,\s]+/, '').trim() || null;
    
    // Extract address (before postal code)
    adresse1 = fullAddress.substring(0, fullAddress.indexOf(postalMatch[0])).trim();
    adresse1 = adresse1.replace(/[,\s]+$/, '') || null;
  }
  
  return { adresse1, codePostal, commune };
}

// Get nested value from object
function getNestedValue(obj: Record<string, any>, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// Set nested value in object, creating path if needed
function setNestedValue(obj: Record<string, any>, path: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ApplyCorrectionRequest = await req.json();

    if (!body.alert_id || !body.actor_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: alert_id, actor_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Applying correction for alert:', body.alert_id);

    // Fetch the alert
    const { data: alert, error: alertError } = await supabase
      .from('verification_alerts')
      .select('*')
      .eq('id', body.alert_id)
      .single();

    if (alertError || !alert) {
      console.error('Alert not found:', alertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Alert not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the fiche
    const { data: fiche, error: ficheError } = await supabase
      .from('fiches_data')
      .select('*')
      .eq('fiche_id', alert.fiche_id)
      .single();

    if (ficheError || !fiche) {
      console.error('Fiche not found:', ficheError);
      return new Response(
        JSON.stringify({ success: false, error: 'Fiche not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldMapping = fieldMappings[alert.field_name];
    if (!fieldMapping) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown field: ${alert.field_name}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deep clone the data to modify
    const updatedData = JSON.parse(JSON.stringify(fiche.data));
    const oldValue = alert.current_value;
    const newValue = alert.found_value;

    // Handle address field
    if (alert.field_name === 'adresse') {
      const parsed = parseAddress(newValue);
      
      if (!updatedData.localisation) {
        updatedData.localisation = {};
      }
      if (!updatedData.localisation.adresse) {
        updatedData.localisation.adresse = {};
      }
      
      if (parsed.adresse1) {
        updatedData.localisation.adresse.adresse1 = parsed.adresse1;
      }
      if (parsed.codePostal) {
        updatedData.localisation.adresse.codePostal = parsed.codePostal;
      }
      if (parsed.commune) {
        if (!updatedData.localisation.adresse.commune) {
          updatedData.localisation.adresse.commune = {};
        }
        updatedData.localisation.adresse.commune.nom = parsed.commune;
      }
    }
    // Handle moyensCommunication fields (telephone, email, site_web)
    else if (fieldMapping.path.includes('moyensCommunication') && fieldMapping.type !== null) {
      // Ensure the path exists
      if (!updatedData.informations) {
        updatedData.informations = {};
      }
      if (!updatedData.informations.moyensCommunication) {
        updatedData.informations.moyensCommunication = [];
      }

      const moyens = updatedData.informations.moyensCommunication;
      
      // Find existing entry of this type
      const existingIndex = moyens.findIndex((m: any) => 
        m.type?.id === fieldMapping.type || 
        m.type?.libelleFr === (alert.field_name === 'telephone' ? 'Téléphone' : 
                               alert.field_name === 'email' ? 'Mél' : 'Site web')
      );

      if (existingIndex >= 0) {
        // Update existing entry
        if (typeof moyens[existingIndex].coordonnees === 'object') {
          moyens[existingIndex].coordonnees.fr = newValue;
        } else {
          moyens[existingIndex].coordonnees = newValue;
        }
      } else {
        // Create new entry
        const typeLabels: Record<number, string> = {
          201: 'Téléphone',
          204: 'Mél',
          205: 'Site web',
        };
        
        moyens.push({
          type: {
            id: fieldMapping.type,
            libelleFr: typeLabels[fieldMapping.type],
          },
          coordonnees: newValue,
        });
      }
    }

    // Update the fiche data
    const { error: updateError } = await supabase
      .from('fiches_data')
      .update({ 
        data: updatedData,
        synced_to_sheets: false // Mark for re-sync
      })
      .eq('id', fiche.id);

    if (updateError) {
      console.error('Error updating fiche:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update fiche data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the alert status to 'fixed'
    const { error: alertUpdateError } = await supabase
      .from('verification_alerts')
      .update({
        status: 'fixed',
        reviewed_at: new Date().toISOString(),
        notes: `Correction appliquée automatiquement par ${body.actor_name}`,
      })
      .eq('id', body.alert_id);

    if (alertUpdateError) {
      console.error('Error updating alert:', alertUpdateError);
    }

    // Log to history
    const fieldLabels: Record<string, string> = {
      telephone: 'Téléphone',
      email: 'Email',
      site_web: 'Site web',
      adresse: 'Adresse',
    };

    const { error: historyError } = await supabase
      .from('fiche_history')
      .insert({
        fiche_id: alert.fiche_id,
        fiche_uuid: fiche.id,
        action_type: 'manual_edit',
        actor_type: 'admin',
        actor_id: body.actor_id || null,
        actor_name: body.actor_name,
        changes: {
          fields: [{
            field: alert.field_name,
            label: fieldLabels[alert.field_name] || alert.field_name,
            old_value: oldValue,
            new_value: newValue,
          }]
        },
        metadata: {
          source: 'verification_alert',
          alert_id: body.alert_id,
          source_url: alert.source_url,
        }
      });

    if (historyError) {
      console.error('Error logging history:', historyError);
    }

    console.log('Correction applied successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Correction appliquée avec succès',
        field: alert.field_name,
        old_value: oldValue,
        new_value: newValue,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-fiche-correction:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
