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
  horaires?: { value: string; confidence: number; reasoning: string } | null;
}

// Domains to exclude from search results (unreliable for official data)
const excludedDomains = [
  'booking.com',
  'tripadvisor',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'linkedin.com',
  'airbnb',
  'hotels.com',
  'expedia',
  'kayak.com',
  'trivago',
];

// Extract contact info from APIDAE data structure
function extractApidaeData(data: Record<string, any>): Record<string, string | null> {
  const result: Record<string, string | null> = {
    telephone: null,
    email: null,
    site_web: null,
    adresse: null,
    horaires: null,
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

  // Extract opening hours
  if (data.ouverture?.periodesOuvertures) {
    const periodes = data.ouverture.periodesOuvertures;
    const horairesText = periodes.map((p: any) => {
      const horairesDetail = p.complementHoraire?.libelleFr || '';
      const debut = p.dateDebut || '';
      const fin = p.dateFin || '';
      if (horairesDetail) {
        return horairesDetail.replace(/\r?\n/g, ' ').trim();
      }
      if (debut && fin) {
        return `Du ${debut} au ${fin}`;
      }
      return '';
    }).filter(Boolean).join(' | ');
    result.horaires = horairesText || null;
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
    case 'horaires':
      // For opening hours, a simple normalized comparison
      return current.toLowerCase().replace(/\s+/g, ' ').trim() === 
             found.toLowerCase().replace(/\s+/g, ' ').trim();
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

// Check if a domain should be excluded
function shouldExcludeDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return excludedDomains.some(excluded => hostname.includes(excluded));
  } catch {
    return false;
  }
}

// Use AI to analyze web content and extract structured data with high accuracy
async function analyzeWithAI(
  establishmentName: string,
  commune: string | null,
  currentData: Record<string, string | null>,
  webContent: string,
  sourceUrl: string,
  apiKey: string,
  useGemini: boolean = false
): Promise<AIAnalysisResult | null> {
  try {
    const prompt = `Tu es un expert en vérification de données d'établissements touristiques français.

ÉTABLISSEMENT À VÉRIFIER: "${establishmentName}"
LOCALISATION: ${commune || 'Non spécifiée'}

DONNÉES ACTUELLES DANS NOTRE BASE:
- Téléphone: ${currentData.telephone || 'Non renseigné'}
- Email: ${currentData.email || 'Non renseigné'}
- Site web: ${currentData.site_web || 'Non renseigné'}
- Adresse: ${currentData.adresse || 'Non renseignée'}
- Horaires: ${currentData.horaires || 'Non renseignés'}

CONTENU DE LA PAGE WEB (source: ${sourceUrl}):
${webContent.substring(0, 10000)}

RÈGLES STRICTES - ELLES SONT IMPÉRATIVES:
1. Ne retourne JAMAIS une valeur si tu n'es pas sûr à 90%+ qu'elle concerne CET établissement précis dans CETTE ville
2. Vérifie que la commune/ville correspond bien (ignore si c'est un homonyme ailleurs)
3. Ignore les numéros de téléphone génériques (offices de tourisme, centrales de réservation)
4. Pour les adresses: la rue ET le code postal doivent correspondre à la même commune
5. Pour les horaires: ne prends que les horaires permanents, pas les événements ponctuels
6. Ignore les informations qui semblent obsolètes (dates passées, "fermé définitivement", etc.)

CRITÈRES DE VALIDATION:
- Téléphone: doit être un numéro à 10 chiffres (ou format international +33)
- Email: doit contenir @ et avoir un domaine valide
- Site web: doit être une URL complète
- Adresse: doit contenir au minimum un numéro de rue OU un lieu-dit + code postal + ville
- Horaires: format "Lundi-Vendredi 9h-18h" ou similaire (pas de dates spécifiques d'événements)

Réponds UNIQUEMENT en JSON valide:
{
  "telephone": { "value": "04 XX XX XX XX", "confidence": 0.9, "reasoning": "Trouvé sur..." } ou null,
  "email": { "value": "contact@example.com", "confidence": 0.9, "reasoning": "..." } ou null,
  "site_web": { "value": "https://...", "confidence": 0.9, "reasoning": "..." } ou null,
  "adresse": { "value": "123 rue..., 04100 Ville", "confidence": 0.9, "reasoning": "..." } ou null,
  "horaires": { "value": "Lundi-Samedi 9h-18h", "confidence": 0.9, "reasoning": "..." } ou null
}

IMPORTANT: 
- Confidence DOIT être >= 0.85 pour être considéré fiable
- Ne retourne QUE les champs où tu as trouvé une différence SIGNIFICATIVE avec nos données
- Si le contenu ne concerne pas CET établissement dans CETTE ville, retourne {}
- Si tu as le moindre doute, retourne {}`;

    let response;
    
    if (useGemini) {
      // Use Gemini API directly
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Tu es un assistant spécialisé dans la vérification de données touristiques françaises. Tu réponds toujours en JSON valide. Tu es très prudent et ne signales que des différences dont tu es certain.\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        return null;
      }

      const geminiResponse = await response.json();
      const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.error('Empty Gemini response');
        return null;
      }

      // Parse JSON from response (handle markdown code blocks)
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```/g, '');
      }
      
      const parsed = JSON.parse(jsonContent);
      console.log('Gemini AI analysis result:', parsed);
      return parsed;
      
    } else {
      // Use Lovable AI Gateway
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un assistant spécialisé dans la vérification de données touristiques françaises. Tu réponds toujours en JSON valide. Tu es très prudent et ne signales que des différences dont tu es certain.' },
            { role: 'user', content: prompt }
          ],
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
    }
    
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

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY_1') || Deno.env.get('FIRECRAWL_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Determine which AI to use - prioritize Gemini if available
    const useGemini = !!geminiApiKey;
    const aiApiKey = geminiApiKey || lovableApiKey;
    
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiApiKey) {
      console.error('No AI API key configured (GEMINI_API_KEY or LOVABLE_API_KEY)');
      return new Response(
        JSON.stringify({ success: false, error: 'No AI API configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Using ${useGemini ? 'Gemini API' : 'Lovable AI'} for analysis`);

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
    // Increased limit from 5 to 8 for better cross-validation
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
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
      horaires: [],
    };

    // Filter out unreliable domains
    const filteredResults = (searchResults.data || []).filter((result: any) => {
      if (shouldExcludeDomain(result.url)) {
        console.log(`Excluding unreliable domain: ${result.url}`);
        return false;
      }
      return true;
    });

    console.log(`Filtered results: ${filteredResults.length} (excluded ${(searchResults.data?.length || 0) - filteredResults.length} unreliable sources)`);

    // Process each search result with AI
    for (const result of filteredResults) {
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
        apidaeData.commune,
        apidaeData,
        markdown,
        sourceUrl,
        aiApiKey,
        useGemini
      );

      if (aiResult) {
        // Collect findings by field (including horaires now)
        for (const field of ['telephone', 'email', 'site_web', 'adresse', 'horaires'] as const) {
          const finding = aiResult[field];
          // Increased confidence threshold from 0.7 to 0.8
          if (finding && finding.value && finding.confidence >= 0.8) {
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

      // STRENGTHENED CRITERIA:
      // Require 1 source ≥90% confidence OR 2+ sources with average confidence ≥80%
      if (bestGroup) {
        const avgConfidence = bestGroup.reduce((sum, f) => sum + f.confidence, 0) / bestGroup.length;
        const hasHighConfidenceSource = bestGroup.some(f => f.confidence >= 0.90);
        const hasMultipleReliableSources = bestGroup.length >= 2 && avgConfidence >= 0.80;

        if (hasHighConfidenceSource || hasMultipleReliableSources) {
          const bestFinding = bestGroup.reduce((best, f) => f.confidence > best.confidence ? f : best);
          const uniqueSources = [...new Set(bestGroup.map(f => f.source))];
          
          alerts.push({
            field_name: field,
            current_value: apidaeData[field as keyof typeof apidaeData],
            found_value: bestFinding.value,
            source_url: bestFinding.sourceUrl,
            source_name: uniqueSources.join(', '),
            confidence_score: Math.min(1, bestFinding.confidence + (uniqueSources.length - 1) * 0.05),
          });
          
          console.log(`Alert created for ${field}: "${bestFinding.value}" confirmed by ${uniqueSources.length} sources (avg confidence: ${avgConfidence.toFixed(2)})`);
        } else {
          console.log(`Skipping ${field}: insufficient confidence (avg: ${avgConfidence.toFixed(2)}, high source: ${hasHighConfidenceSource})`);
        }
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

    // Update fiche verification timestamp in fiches_data (but NOT the status - that's only for manual validation)
    const { error: updateError } = await supabase
      .from('fiches_data')
      .update({
        last_verified_at: new Date().toISOString(),
        // verification_status reste inchangé jusqu'à validation manuelle
      })
      .eq('fiche_id', fiche_id);

    if (updateError) {
      console.error('Error updating fiche verification timestamp:', updateError);
    }

// Copier automatiquement vers fiches_verified après vérification Firecrawl
    // IMPORTANT: Dans fiches_verified, on applique directement les corrections trouvées
    const verificationStatus = alerts.length > 0 ? 'pending_review' : 'auto_verified';
    
    // Créer une copie des données avec les corrections appliquées pour fiches_verified
    let correctedData = JSON.parse(JSON.stringify(fiche.data));
    
    if (alerts.length > 0) {
      console.log(`Applying ${alerts.length} corrections to fiches_verified data...`);
      
      for (const alert of alerts) {
        const newValue = alert.found_value;
        if (!newValue) continue;
        
        // Apply address corrections
        if (alert.field_name === 'adresse') {
          // Parse the full address
          const postalMatch = newValue.match(/\b(\d{5})\b/);
          const codePostal = postalMatch ? postalMatch[1] : null;
          let commune = null;
          let adresse1: string | null = newValue;
          
          if (postalMatch) {
            const afterPostal = newValue.substring(newValue.indexOf(postalMatch[0]) + 5).trim();
            commune = afterPostal.replace(/^[,\s]+/, '').trim() || null;
            adresse1 = newValue.substring(0, newValue.indexOf(postalMatch[0])).trim();
            adresse1 = adresse1.replace(/[,\s]+$/, '') || null;
          }
          
          if (!correctedData.localisation) correctedData.localisation = {};
          if (!correctedData.localisation.adresse) correctedData.localisation.adresse = {};
          
          if (adresse1) correctedData.localisation.adresse.adresse1 = adresse1;
          if (codePostal) correctedData.localisation.adresse.codePostal = codePostal;
          if (commune) {
            if (!correctedData.localisation.adresse.commune) correctedData.localisation.adresse.commune = {};
            correctedData.localisation.adresse.commune.nom = commune;
          }
          console.log(`Applied address correction: ${newValue}`);
        }
        // Apply moyensCommunication corrections (telephone, email, site_web)
        else if (['telephone', 'email', 'site_web'].includes(alert.field_name)) {
          const typeIdMap: Record<string, number> = { telephone: 201, email: 204, site_web: 205 };
          const typeLabelsMap: Record<string, string> = { telephone: 'Téléphone', email: 'Mél', site_web: 'Site web' };
          const typeId = typeIdMap[alert.field_name];
          const typeLabel = typeLabelsMap[alert.field_name];
          
          if (!correctedData.informations) correctedData.informations = {};
          if (!correctedData.informations.moyensCommunication) correctedData.informations.moyensCommunication = [];
          
          const moyens = correctedData.informations.moyensCommunication;
          const existingIndex = moyens.findIndex((m: any) => 
            m.type?.id === typeId || m.type?.libelleFr === typeLabel
          );
          
          if (existingIndex >= 0) {
            if (typeof moyens[existingIndex].coordonnees === 'object') {
              moyens[existingIndex].coordonnees.fr = newValue;
            } else {
              moyens[existingIndex].coordonnees = newValue;
            }
          } else {
            moyens.push({
              type: { id: typeId, libelleFr: typeLabel },
              coordonnees: newValue,
            });
          }
          console.log(`Applied ${alert.field_name} correction: ${newValue}`);
        }
        // Apply horaires corrections
        else if (alert.field_name === 'horaires') {
          if (!correctedData.ouverture) correctedData.ouverture = {};
          if (!correctedData.ouverture.periodesOuvertures) correctedData.ouverture.periodesOuvertures = [];
          
          // Add or update the first opening period with the new hours
          if (correctedData.ouverture.periodesOuvertures.length > 0) {
            if (!correctedData.ouverture.periodesOuvertures[0].complementHoraire) {
              correctedData.ouverture.periodesOuvertures[0].complementHoraire = {};
            }
            correctedData.ouverture.periodesOuvertures[0].complementHoraire.libelleFr = newValue;
          } else {
            correctedData.ouverture.periodesOuvertures.push({
              complementHoraire: { libelleFr: newValue }
            });
          }
          console.log(`Applied horaires correction: ${newValue}`);
        }
      }
    }
    
    const { error: verifiedUpsertError } = await supabase
      .from('fiches_verified')
      .upsert({
        fiche_id: fiche_id,
        fiche_type: fiche.fiche_type,
        source: fiche.source,
        data: correctedData, // Données avec corrections appliquées
        is_published: fiche.is_published,
        synced_to_sheets: false,
        verification_status: verificationStatus,
        verified_at: new Date().toISOString(),
        verified_by: null, // Vérification automatique (pas de user)
      }, { onConflict: 'fiche_id' });

    if (verifiedUpsertError) {
      console.error('Error upserting to fiches_verified:', verifiedUpsertError);
    } else {
      console.log(`Fiche ${fiche_id} copied to fiches_verified with status: ${verificationStatus}`);
    }

    // Log to fiche_history
    if (alerts.length > 0) {
      const fieldLabels: Record<string, string> = {
        telephone: 'Téléphone',
        email: 'Email',
        site_web: 'Site web',
        adresse: 'Adresse',
        horaires: "Horaires d'ouverture",
      };

      const historyChanges = {
        fields: alerts.map(alert => ({
          field: alert.field_name,
          label: fieldLabels[alert.field_name] || alert.field_name,
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
            sources: [...new Set(alerts.flatMap(a => a.source_name.split(', ')))],
            model: 'openai/gpt-5-mini',
          }
        });

      if (historyError) {
        console.error('Error logging history:', historyError);
      }

      // Check if auto-push to Apidae is enabled
      const { data: verificationConfig } = await supabase
        .from('verification_config')
        .select('auto_push_to_apidae')
        .single();

      if (verificationConfig?.auto_push_to_apidae && alerts.length > 0) {
        console.log(`Auto-push enabled, pushing ${alerts.length} corrections to Apidae for fiche ${fiche_id}...`);
        
        // Build changes object for push-to-apidae
        const pushChanges: Record<string, string> = {};
        
        for (const alert of alerts) {
          if (!alert.found_value) continue;
          
          // Map field names to Apidae-compatible field names
          if (alert.field_name === 'adresse') {
            // Parse address components
            const postalMatch = alert.found_value.match(/\b(\d{5})\b/);
            if (postalMatch) {
              const beforePostal = alert.found_value.substring(0, alert.found_value.indexOf(postalMatch[0])).trim().replace(/[,\s]+$/, '');
              if (beforePostal) pushChanges['adresse1'] = beforePostal;
              pushChanges['codePostal'] = postalMatch[1];
            } else {
              pushChanges['adresse1'] = alert.found_value;
            }
          } else if (alert.field_name === 'horaires') {
            pushChanges['periodeEnClair'] = alert.found_value;
          }
          // Note: telephone, email, site_web are ignored by push-to-apidae
          // (requires complex moyensCommunication structure)
        }

        if (Object.keys(pushChanges).length > 0) {
          const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL');
          const SUPABASE_SERVICE_ROLE_KEY_ENV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          try {
            const pushResponse = await fetch(`${SUPABASE_URL_ENV}/functions/v1/push-to-apidae`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY_ENV}`,
              },
              body: JSON.stringify({
                ficheId: fiche_id,
                changes: pushChanges,
                skipValidation: true,
              }),
            });

            const pushResult = await pushResponse.json();
            
            if (pushResponse.ok && pushResult.success) {
              console.log(`Successfully pushed corrections to Apidae for fiche ${fiche_id}:`, pushResult.pushedFields);
            } else {
              console.warn(`Failed to push corrections to Apidae for fiche ${fiche_id}:`, pushResult);
            }
          } catch (pushError) {
            console.error('Error pushing to Apidae:', pushError);
          }
        } else {
          console.log(`No pushable changes for Apidae (only complex fields found)`);
        }
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
