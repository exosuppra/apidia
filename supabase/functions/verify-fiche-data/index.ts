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

interface AIAnalysisResult {
  telephone?: { value: string; confidence: number; reasoning: string } | null;
  email?: { value: string; confidence: number; reasoning: string } | null;
  site_web?: { value: string; confidence: number; reasoning: string } | null;
  adresse?: { value: string; confidence: number; reasoning: string } | null;
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
    case 'adresse':
      return normalizeAddress(current) === normalizeAddress(found);
    default:
      return current.toLowerCase().trim() === found.toLowerCase().trim();
  }
}

// Normalize address for comparison
function normalizeAddress(address: string | null): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-''`]/g, ' ')
    .replace(/\b(avenue|av\.?)\b/gi, 'av')
    .replace(/\b(boulevard|bd\.?)\b/gi, 'bd')
    .replace(/\b(rue|r\.)\b/gi, 'rue')
    .replace(/\b(place|pl\.)\b/gi, 'pl')
    .replace(/\b(chemin|ch\.)\b/gi, 'ch')
    .replace(/\b(route|rte\.)\b/gi, 'rte')
    .replace(/\b(impasse|imp\.)\b/gi, 'imp')
    .replace(/\b(allee|allée|all\.)\b/gi, 'all')
    .replace(/\b(quartier|qrt\.?)\b/gi, 'qrt')
    .replace(/ç/g, 'c')
    .replace(/[\s,]+/g, ' ')
    .trim();
}

// Use AI to analyze web content and extract structured data with high accuracy
async function analyzeWithAI(
  establishmentName: string,
  currentData: Record<string, string | null>,
  webContent: string,
  sourceUrl: string,
  lovableApiKey: string
): Promise<AIAnalysisResult | null> {
  try {
    const prompt = `Tu es un expert en vérification de données d'établissements touristiques.

ÉTABLISSEMENT À VÉRIFIER: "${establishmentName}"

DONNÉES ACTUELLES DANS NOTRE BASE:
- Téléphone: ${currentData.telephone || 'Non renseigné'}
- Email: ${currentData.email || 'Non renseigné'}
- Site web: ${currentData.site_web || 'Non renseigné'}
- Adresse: ${currentData.adresse || 'Non renseignée'}

CONTENU DE LA PAGE WEB (source: ${sourceUrl}):
${webContent.substring(0, 8000)}

INSTRUCTIONS:
1. Analyse le contenu de la page web pour extraire les coordonnées de l'établissement "${establishmentName}"
2. Compare UNIQUEMENT si tu trouves des informations qui concernent SPÉCIFIQUEMENT cet établissement (pas des informations génériques ou d'autres établissements)
3. Pour chaque champ où tu trouves une DIFFÉRENCE avec nos données actuelles, indique la valeur trouvée
4. IMPORTANT: Ne retourne un champ QUE SI:
   - Tu as trouvé une valeur différente de celle dans notre base
   - Tu es CERTAIN que cette valeur concerne bien l'établissement "${establishmentName}"
   - La valeur est complète (téléphone 10 chiffres, email avec @, adresse complète avec numéro ET rue ET ville)

Réponds UNIQUEMENT en JSON valide avec ce format (omets les champs où il n'y a pas de différence):
{
  "telephone": { "value": "04 XX XX XX XX", "confidence": 0.9, "reasoning": "Trouvé sur la page contact..." } ou null,
  "email": { "value": "contact@example.com", "confidence": 0.85, "reasoning": "..." } ou null,
  "site_web": { "value": "https://...", "confidence": 0.8, "reasoning": "..." } ou null,
  "adresse": { "value": "123 rue..., 04100 Manosque", "confidence": 0.9, "reasoning": "..." } ou null
}

IMPORTANT: 
- Confidence doit être entre 0 et 1 (0.8+ pour être fiable)
- Ne retourne QUE les champs où tu as trouvé une différence significative
- Si le contenu ne concerne pas cet établissement ou si tu ne trouves rien, retourne {}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un assistant spécialisé dans la vérification de données. Tu réponds toujours en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      return null;
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('Empty AI response');
      return null;
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```/g, '');
    }
    
    const parsed = JSON.parse(jsonContent);
    console.log('AI analysis result:', parsed);
    return parsed;
    
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return null;
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI not configured' }),
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

    // Search using Firecrawl - get markdown content for AI analysis
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
          formats: ['markdown'],
          onlyMainContent: true,
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
    const aiFindings: Record<string, Array<{ value: string; confidence: number; source: string; sourceUrl: string }>> = {
      telephone: [],
      email: [],
      site_web: [],
      adresse: [],
    };

    // Process each search result with AI
    for (const result of (searchResults.data || [])) {
      const sourceUrl = result.url;
      const sourceName = new URL(sourceUrl).hostname.replace('www.', '');
      const markdown = result.markdown || '';
      
      if (!markdown || markdown.length < 100) {
        console.log(`Skipping ${sourceName}: insufficient content`);
        continue;
      }

      console.log(`Analyzing ${sourceName} with AI (${markdown.length} chars)...`);
      
      // Use AI to analyze the content
      const aiResult = await analyzeWithAI(
        apidaeData.nom,
        apidaeData,
        markdown,
        sourceUrl,
        lovableApiKey
      );

      if (aiResult) {
        // Collect findings by field
        for (const field of ['telephone', 'email', 'site_web', 'adresse'] as const) {
          const finding = aiResult[field];
          if (finding && finding.value && finding.confidence >= 0.7) {
            // Check if it's actually different from current value
            if (!valuesMatch(apidaeData[field], finding.value, field)) {
              aiFindings[field].push({
                value: finding.value,
                confidence: finding.confidence,
                source: sourceName,
                sourceUrl: sourceUrl,
              });
              console.log(`AI found ${field} discrepancy from ${sourceName}: "${finding.value}" (confidence: ${finding.confidence})`);
            }
          }
        }
      }

      // Small delay between AI calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create alerts for fields where AI found consistent discrepancies
    for (const [field, findings] of Object.entries(aiFindings)) {
      if (findings.length === 0) continue;
      
      console.log(`Processing ${findings.length} AI findings for ${field}`);
      
      // Group by similar values (in case multiple sources report the same correction)
      const valueGroups: Record<string, typeof findings> = {};
      for (const finding of findings) {
        let matched = false;
        for (const key of Object.keys(valueGroups)) {
          if (valuesMatch(key, finding.value, field)) {
            valueGroups[key].push(finding);
            matched = true;
            break;
          }
        }
        if (!matched) {
          valueGroups[finding.value] = [finding];
        }
      }

      // Find the most common value with highest confidence
      let bestGroup: typeof findings | null = null;
      let bestScore = 0;
      
      for (const group of Object.values(valueGroups)) {
        // Score = number of sources * average confidence
        const avgConfidence = group.reduce((sum, f) => sum + f.confidence, 0) / group.length;
        const score = group.length * avgConfidence;
        
        if (score > bestScore) {
          bestScore = score;
          bestGroup = group;
        }
      }

      // Require at least 1 high-confidence source OR 2+ sources to create an alert
      if (bestGroup && (bestGroup.length >= 2 || bestGroup.some(f => f.confidence >= 0.85))) {
        const bestFinding = bestGroup.reduce((best, f) => f.confidence > best.confidence ? f : best);
        const uniqueSources = [...new Set(bestGroup.map(f => f.source))];
        
        alerts.push({
          field_name: field,
          current_value: apidaeData[field as keyof typeof apidaeData],
          found_value: bestFinding.value,
          source_url: bestFinding.sourceUrl,
          source_name: uniqueSources.join(', '),
          confidence_score: Math.min(1, bestFinding.confidence + (uniqueSources.length - 1) * 0.1),
        });
        
        console.log(`Alert created for ${field}: "${bestFinding.value}" confirmed by ${uniqueSources.length} sources`);
      }
    }

    console.log(`Found ${alerts.length} confirmed alerts`);

    // Insert alerts into database
    if (alerts.length > 0) {
      const alertsToInsert = alerts.map(alert => ({
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
        verification_status: alerts.length > 0 ? 'alerts_found' : 'verified',
      })
      .eq('fiche_id', fiche_id);

    if (updateError) {
      console.error('Error updating fiche status:', updateError);
    }

    // Log to fiche_history
    if (alerts.length > 0) {
      const historyChanges = {
        fields: alerts.map(alert => ({
          field: alert.field_name,
          label: alert.field_name === 'telephone' ? 'Téléphone' 
               : alert.field_name === 'email' ? 'Email' 
               : alert.field_name === 'site_web' ? 'Site web'
               : alert.field_name === 'adresse' ? 'Adresse'
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
            alerts_count: alerts.length,
            sources: [...new Set(alerts.flatMap(a => a.source_name.split(', ')))]
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
        alerts_count: alerts.length,
        alerts: alerts,
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
