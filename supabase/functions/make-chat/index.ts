import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@131.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions for the AI agent
const tools = [
  {
    type: "function",
    function: {
      name: "get_apidia_info",
      description: "Récupère les informations complètes sur la plateforme Apidia elle-même : fonctionnalités, modules, capacités. Utilise cet outil quand l'utilisateur demande des informations sur ce que fait Apidia ou ses fonctionnalités.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "call_make_webhook",
      description: `Appelle le webhook Make pour exécuter des automatisations externes.

**CAPACITÉS DE MAKE :**
- Envoyer des emails à n'importe quelle adresse
- Créer des pages Notion
- Créer des designs Canva (affiches, posts réseaux sociaux, présentations, visuels)
- Envoyer des notifications (Slack, Teams, etc.)
- Exporter des données vers d'autres services
- Toute automatisation configurée dans Make

**IMPORTANT - AVANT D'APPELER CET OUTIL :**
1. Make n'a PAS accès aux données d'Apidia ni à ta mémoire de conversation
2. Tu DOIS fournir TOUTES les informations nécessaires dans le paramètre 'data'
3. Si l'action nécessite des données d'Apidia (stats, listes, contenus), récupère-les D'ABORD avec les outils query_*
4. Le paramètre 'data' doit contenir le contenu COMPLET et PRÊT À L'EMPLOI

**Exemples d'utilisation :**
- "Envoie les stats par email à user@email.com" → D'abord query_stats_web, puis call_make_webhook avec action="Envoyer un email", data={email:"user@email.com", subject:"Stats", content:"<données récupérées>"}
- "Crée une page Notion sur les fonctionnalités" → D'abord get_apidia_info, puis call_make_webhook avec le contenu complet
- "Crée une affiche pour l'événement X" → call_make_webhook avec action="Créer un design Canva", data={type:"affiche", titre:"...", contenu:"..."}`,
      parameters: {
        type: "object",
        properties: {
          action: { 
            type: "string", 
            description: "Action à exécuter: 'Envoyer un email', 'Créer une page Notion', 'Envoyer une notification', etc." 
          },
          context: { 
            type: "string", 
            description: "Contexte complet de la demande utilisateur - reformule la demande originale avec tous les détails" 
          },
          data: { 
            type: "object", 
            description: "OBLIGATOIRE : Toutes les données pour l'action. Pour un email: {email, subject, content}. Pour Notion: {title, content}." 
          }
        },
        required: ["action", "context", "data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Recherche des tâches dans la base de données. Permet de filtrer par statut, priorité, planning, date d'échéance, etc.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["todo", "in_progress", "done"], description: "Filtrer par statut" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Filtrer par priorité" },
          planning_id: { type: "string", description: "Filtrer par ID de planning" },
          due_date: { type: "string", description: "Date d'échéance exacte au format YYYY-MM-DD (ex: 2026-01-05 pour aujourd'hui)" },
          due_date_from: { type: "string", description: "Date d'échéance minimum au format YYYY-MM-DD" },
          due_date_to: { type: "string", description: "Date d'échéance maximum au format YYYY-MM-DD" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_plannings",
      description: "Récupère la liste des plannings éditoriaux disponibles.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_user_requests",
      description: "Récupère les demandes utilisateurs (modifications de fiches).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "approved", "rejected"], description: "Filtrer par statut" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_google_ratings",
      description: "Récupère les notes Google (e-réputation) des établissements.",
      parameters: {
        type: "object",
        properties: {
          establishment_name: { type: "string", description: "Filtrer par nom d'établissement" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_action_logs",
      description: "Récupère les logs d'actions utilisateurs.",
      parameters: {
        type: "object",
        properties: {
          action_type: { type: "string", description: "Filtrer par type d'action" },
          user_email: { type: "string", description: "Filtrer par email utilisateur" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_fiches_sheets",
      description: "Récupère les fiches touristiques depuis Google Sheets (BD COS, BD FETE_ET_MANIFESTATION, etc.). Contient les informations sur les établissements, événements, hébergements.",
      parameters: {
        type: "object",
        properties: {
          sheet_name: { type: "string", description: "Nom de la feuille spécifique à interroger" },
          search_term: { type: "string", description: "Terme de recherche dans les fiches" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_stats_web",
      description: "Récupère les statistiques web depuis Google Sheets (fréquentation des sites web). Les données contiennent les utilisateurs actifs, sessions, pages vues par mois/année pour chaque site (Gréoux-les-Bains, Manosque, Pays de Manosque, etc.).",
      parameters: {
        type: "object",
        properties: {
          site_name: { type: "string", description: "Nom du site: 'Gréoux', 'Manosque', 'Pays de Manosque', etc." },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 100 pour avoir toutes les données annuelles)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_stats_ereputation",
      description: "Récupère les statistiques d'e-réputation depuis Google Sheets.",
      parameters: {
        type: "object",
        properties: {
          establishment_name: { type: "string", description: "Nom de l'établissement" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_rh_data",
      description: "Récupère les données RH depuis Google Sheets.",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "Terme de recherche" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_fiches_apidae",
      description: `Recherche dans les ~5000 fiches touristiques synchronisées depuis Apidae (table fiches_data). Permet de chercher par nom, type de fiche, commune, source, statut de publication.

RÈGLE CRITIQUE - "QUE FAIRE / QUOI FAIRE" avec une date précise :
Quand l'utilisateur demande "que faire", "quoi faire", "qu'est-ce qu'il y a", "quels événements" à une date précise :
1. Tu DOIS faire 2 appels SÉPARÉS avec date_active :
   - Appel 1 : fiche_type="FETE_ET_MANIFESTATION", date_active="YYYY-MM-DD", limit=50
   - Appel 2 : fiche_type="ACTIVITE", date_active="YYYY-MM-DD", limit=50
2. Tu NE DOIS PAS inclure RESTAURATION, HEBERGEMENT_LOCATIF, HEBERGEMENT_COLLECTIF, STRUCTURE dans ces résultats sauf si l'utilisateur le demande EXPLICITEMENT.
3. Présente UNIQUEMENT les événements/activités trouvés via date_active.

GESTION DES DATES :
- Utilise le paramètre 'date_active' (format YYYY-MM-DD) pour filtrer directement en base les fiches actives à une date précise.
- Sans date_active, toutes les fiches sont retournées quelle que soit leur période d'ouverture.`,
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "Recherche par nom de la fiche (recherche partielle insensible à la casse)" },
          fiche_type: { 
            type: "string", 
            enum: ["STRUCTURE", "COMMERCE_ET_SERVICE", "HEBERGEMENT_LOCATIF", "FETE_ET_MANIFESTATION", "EQUIPEMENT", "RESTAURATION", "PATRIMOINE_CULTUREL", "ACTIVITE", "HEBERGEMENT_COLLECTIF", "SEJOUR_PACKAGE", "DEGUSTATION"],
            description: "Type de fiche Apidae" 
          },
          commune: { type: "string", description: "Recherche par nom de commune (recherche partielle insensible à la casse)" },
          source: { type: "string", enum: ["apidae", "make_webhook"], description: "Filtrer par source de la fiche" },
          is_published: { type: "boolean", description: "Filtrer par statut de publication" },
          date_active: { type: "string", description: "Date au format YYYY-MM-DD. Filtre les fiches dont les périodes d'ouverture couvrent cette date. Utilise ce paramètre quand l'utilisateur demande ce qui se passe à une date précise." },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20, max: 100)" }
        }
      }
    }
  }
];

// Execute tool calls
async function executeTool(toolName: string, args: any, supabaseAdmin: any, threadId: string, fichesPreviews: any[]): Promise<string> {
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  try {
    switch (toolName) {
      case "get_apidia_info": {
        const apidiaInfo = `# Plateforme Apidia - Fonctionnalités

## 1. Planification Éditoriale
- Gestion de calendriers éditoriaux pour les réseaux sociaux et contenus
- Création et suivi de tâches avec statuts (À faire, En cours, Terminé)
- Attribution de priorités (Basse, Moyenne, Haute)
- Dates d'échéance et assignation aux membres de l'équipe
- Système de tags/étiquettes pour organiser les contenus
- Pièces jointes et commentaires sur les tâches
- Partage public de plannings avec lien sécurisé

## 2. Gestion des Fiches Touristiques
- Consultation des fiches des établissements, événements, hébergements
- Données issues du système APIDAE (référentiel touristique)
- Demandes de modification par les professionnels du tourisme
- Workflow de validation des modifications
- Catégories : BD COS, BD FETE_ET_MANIFESTATION, etc.

## 3. Suivi de l'E-réputation
- Suivi des notes Google des établissements
- Historique des évaluations et nombre d'avis
- Alertes sur les évolutions de notes
- Statistiques d'e-réputation consolidées

## 4. Statistiques Web
- Tableau de bord de fréquentation des sites web
- Graphiques d'évolution des visites
- Comparaison entre périodes
- Données par site (pays-de-manosque.fr, manosque-tourisme.com, etc.)

## 5. Gestion RH
- Suivi des données collaborateurs
- Planning et organisation des équipes
- Informations ressources humaines

## 6. Agent IA Conversationnel
- Assistant intelligent intégré au tableau de bord
- Interrogation des données en langage naturel
- Historique des conversations
- Reconnaissance vocale

## 7. Intégrations Make (Automatisations)
- Création automatique de pages Notion
- Envoi d'emails et notifications
- Connexion avec des services tiers
- Workflows personnalisés`;

        return apidiaInfo;
      }

      case "call_make_webhook": {
        const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");
        if (!MAKE_WEBHOOK_URL) {
          return JSON.stringify({ error: "Webhook Make non configuré" });
        }
        
        const response = await fetch(MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: args.action,
            context: args.context || "",
            data: args.data || {},
            threadId,
            timestamp: new Date().toISOString(),
            source: "apidia-dashboard-agent",
          }),
        });
        
        let responseData;
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          responseData = await response.json();
        } else {
          const textResponse = await response.text();
          responseData = { message: textResponse || "Action exécutée avec succès" };
        }
        
        console.log("Make webhook response:", responseData);
        
        // Format the response to clearly indicate it should be shown to user
        return JSON.stringify({
          success: response.ok,
          make_response: responseData,
          instruction: "IMPORTANT: Transmets directement cette réponse de Make à l'utilisateur. Le contenu de 'make_response' est la réponse officielle à afficher."
        });
      }
      
      case "query_tasks": {
        let query = supabaseAdmin.from("tasks").select("*");
        if (args.status) query = query.eq("status", args.status);
        if (args.priority) query = query.eq("priority", args.priority);
        if (args.planning_id) query = query.eq("planning_id", args.planning_id);
        
        // Date filtering
        if (args.due_date) {
          // Filter for exact date (start of day to end of day)
          const startOfDay = `${args.due_date}T00:00:00`;
          const endOfDay = `${args.due_date}T23:59:59`;
          query = query.gte("due_date", startOfDay).lte("due_date", endOfDay);
        } else {
          if (args.due_date_from) {
            query = query.gte("due_date", `${args.due_date_from}T00:00:00`);
          }
          if (args.due_date_to) {
            query = query.lte("due_date", `${args.due_date_to}T23:59:59`);
          }
        }
        
        query = query.order("due_date", { ascending: true }).limit(args.limit || 20);
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "query_plannings": {
        const { data, error } = await supabaseAdmin
          .from("editorial_plannings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(args.limit || 20);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "query_user_requests": {
        let query = supabaseAdmin.from("user_requests").select("*");
        if (args.status) query = query.eq("status", args.status);
        query = query.order("created_at", { ascending: false }).limit(args.limit || 20);
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "query_google_ratings": {
        let query = supabaseAdmin.from("ereputation_google_ratings").select("*");
        if (args.establishment_name) query = query.ilike("establishment_name", `%${args.establishment_name}%`);
        query = query.order("last_updated_at", { ascending: false }).limit(args.limit || 20);
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "query_action_logs": {
        let query = supabaseAdmin.from("user_action_logs").select("*");
        if (args.action_type) query = query.eq("action_type", args.action_type);
        if (args.user_email) query = query.ilike("user_email", `%${args.user_email}%`);
        query = query.order("created_at", { ascending: false }).limit(args.limit || 50);
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "query_fiches_apidae": {
        const limit = Math.min(args.limit || 20, 100);
        
        // Use the dedicated SQL function for JSONB filtering (avoids PostgREST limitations)
        // Now supports date_active for filtering fiches active on a specific date
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("search_fiches_apidae", {
          p_search_term: args.search_term || null,
          p_fiche_type: args.fiche_type || null,
          p_commune: args.commune || null,
          p_source: args.source || null,
          p_is_published: args.is_published !== undefined ? args.is_published : null,
          p_limit: limit,
          p_date_active: args.date_active || null,
        });
        
        if (rpcError) {
          console.error("query_fiches_apidae error:", rpcError);
          throw rpcError;
        }

        // Enrich results with opening period description for the AI
        const ficheIds = (rpcData || []).map((f: any) => f.fiche_id);
        let enriched = rpcData || [];
        // Fetch full data for enrichment (opening periods + previews)
        const PREVIEW_TYPES = ["FETE_ET_MANIFESTATION", "ACTIVITE", "PATRIMOINE_CULTUREL", "DEGUSTATION"];
        
        if (ficheIds.length > 0) {
          const { data: rawData } = await supabaseAdmin
            .from("fiches_data")
            .select("fiche_id, data")
            .in("fiche_id", ficheIds);
          
          if (rawData) {
            const rawMap: Record<string, any> = {};
            rawData.forEach((r: any) => { rawMap[r.fiche_id] = r; });
            enriched = enriched.map((f: any) => {
              const raw = rawMap[f.fiche_id]?.data || {};
              return {
                ...f,
                ouverture: raw.ouverture || null,
                _rawData: raw,
              };
            });
          }
        }

        // Accumulate previews for relevant types
        const ficheType = args.fiche_type;
        if (!ficheType || PREVIEW_TYPES.includes(ficheType)) {
          for (const f of enriched) {
            if (!PREVIEW_TYPES.includes(f.fiche_type)) continue;
            const raw = f._rawData || {};
            const periode = raw.ouverture?.periodesOuvertures?.[0];
            
            // Extract the first available image URL from the fiche data
            let imageUrl: string | undefined;
            const illustrations = raw.illustrations || raw.multimedias || [];
            for (const media of illustrations) {
              const url = media?.traductionFichiers?.[0]?.url || media?.url || media?.urlImage;
              if (url && typeof url === "string" && url.startsWith("http")) {
                imageUrl = url;
                break;
              }
            }
            
            // Extract contact info
            const informations = raw.informations || {};
            const moyensCom = informations.moyensCommunication || 
                              raw.localisation?.adresse?.moyensCommunication || [];
            let telephone: string | undefined;
            let email: string | undefined;
            let siteWeb: string | undefined;
            for (const mc of moyensCom) {
              const type = mc?.type?.libelleFr?.toLowerCase() || mc?.type?.id?.toLowerCase() || "";
              const coord = mc?.coordonnees?.fr || mc?.coordonnees?.[""] || mc?.coordonnees || "";
              if (!telephone && (type.includes("téléphone") || type === "telephone" || type === "201")) telephone = coord;
              if (!email && (type.includes("mail") || type === "email" || type === "204")) email = coord;
              if (!siteWeb && (type.includes("site") || type === "site_web" || type === "205")) siteWeb = coord;
            }

            // Extract address
            const adresse = raw.localisation?.adresse || {};
            const adresseStr = [
              adresse.adresse1,
              adresse.adresse2,
              adresse.adresse3,
            ].filter(Boolean).join(", ") || undefined;
            const codePostal = adresse.codePostal || undefined;
            const commune = f.commune || adresse.commune?.nom || undefined;

            // Extract tarif
            let tarif: string | undefined;
            const descTarif = raw.descriptionTarif?.fr?.[0] || raw.descriptionTarif?.[""]?.[0];
            if (descTarif) {
              tarif = descTarif;
            } else {
              const periodesTarif = raw.periodes?.[0]?.tarifMin || raw.tarifsEnClair?.fr?.[0];
              if (periodesTarif) tarif = typeof periodesTarif === "number" ? `À partir de ${periodesTarif} €` : periodesTarif;
            }

            fichesPreviews.push({
              fiche_id: f.fiche_id,
              nom: f.nom,
              type: f.fiche_type,
              commune: f.commune,
              description: f.description_courte || undefined,
              date_debut: periode?.dateDebut || undefined,
              heure_debut: periode?.horaireOuverture || undefined,
              date_fin: periode?.dateFin || undefined,
              image_url: imageUrl,
              adresse: adresseStr,
              code_postal: codePostal,
              telephone,
              email,
              site_web: siteWeb,
              tarif,
            });
          }
        }

        // Strip _rawData before returning to AI (saves tokens)
        const forAI = enriched.map(({ _rawData, ...rest }: any) => rest);
        return JSON.stringify({ count: forAI.length, fiches: forAI });
      }

      case "query_fiches_sheets": {
        return await queryGoogleSheets("fiches", args);
      }
      
      case "query_stats_web": {
        return await queryGoogleSheets("stats_web", args);
      }
      
      case "query_stats_ereputation": {
        return await queryGoogleSheets("stats_ereputation", args);
      }
      
      case "query_rh_data": {
        return await queryGoogleSheets("rh", args);
      }
      
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: error.message || "Erreur lors de l'exécution" });
  }
}

// Query Google Sheets based on type
async function queryGoogleSheets(type: string, args: any): Promise<string> {
  const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!SA_JSON) {
    return JSON.stringify({ error: "Configuration Google Sheets manquante" });
  }

  let sheetId: string | undefined;
  switch (type) {
    case "fiches":
      sheetId = Deno.env.get("GOOGLE_SHEETS_ID");
      break;
    case "stats_web":
      sheetId = Deno.env.get("GOOGLE_SHEETS_STATS_WEB_ID");
      break;
    case "stats_ereputation":
      sheetId = Deno.env.get("GOOGLE_SHEETS_EREPUTATION_ID");
      break;
    case "rh":
      sheetId = Deno.env.get("GOOGLE_SHEETS_RH_ID");
      break;
  }

  if (!sheetId) {
    return JSON.stringify({ error: `ID de feuille manquant pour ${type}` });
  }

  try {
    const sa = JSON.parse(SA_JSON);
    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: (sa.private_key as string).replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const allSheets = spreadsheet.data.sheets || [];
    
    // Filter sheets based on args
    let sheetsToQuery = allSheets;
    if (args.sheet_name) {
      sheetsToQuery = allSheets.filter(s => 
        s.properties?.title?.toLowerCase().includes(args.sheet_name.toLowerCase())
      );
    }

    const results: any[] = [];
    const limit = args.limit || 50;

    for (const sheet of sheetsToQuery.slice(0, 5)) { // Max 5 sheets to avoid timeout
      const sheetName = sheet.properties?.title || "";
      if (sheetName.toUpperCase().includes("SOURCING")) continue;

      try {
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${sheetName}!A1:ZZ200`,
          majorDimension: "ROWS",
        });

        const rows = resp.data.values || [];
        if (rows.length < 2) continue;

        const headers = rows[0].map((h: string) => h?.toString().trim().toLowerCase() || "");
        
        for (let i = 1; i < Math.min(rows.length, limit + 1); i++) {
          const row = rows[i] as string[];
          const obj: Record<string, string> = { _sheet: sheetName };
          
          for (let c = 0; c < headers.length && c < row.length; c++) {
            if (headers[c]) {
              obj[headers[c]] = (row[c] ?? "").toString();
            }
          }
          
          // Search filter
          if (args.search_term) {
            const searchLower = args.search_term.toLowerCase();
            const matches = Object.values(obj).some(v => 
              v.toLowerCase().includes(searchLower)
            );
            if (!matches) continue;
          }
          
          // Establishment filter for ereputation
          if (args.establishment_name) {
            const nameLower = args.establishment_name.toLowerCase();
            const matches = Object.values(obj).some(v => 
              v.toLowerCase().includes(nameLower)
            );
            if (!matches) continue;
          }
          
          // Site filter for stats_web
          if (args.site_name) {
            const siteLower = args.site_name.toLowerCase();
            const matches = sheetName.toLowerCase().includes(siteLower) || 
              Object.values(obj).some(v => v.toLowerCase().includes(siteLower));
            if (!matches) continue;
          }
          
          results.push(obj);
          if (results.length >= limit) break;
        }
        
        if (results.length >= limit) break;
      } catch (sheetError) {
        console.log(`Could not read sheet ${sheetName}:`, sheetError.message);
        continue;
      }
    }

    return JSON.stringify(results.slice(0, limit));
  } catch (error) {
    console.error("Google Sheets error:", error);
    return JSON.stringify({ error: error.message || "Erreur Google Sheets" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, threadId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API AI non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin Supabase client for database queries
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Accumulator for fiche previews across all tool calls
    const fichesPreviews: any[] = [];

    // Get current date/time in Paris timezone
    const now = new Date();
    const parisTime = now.toLocaleString("fr-FR", { 
      timeZone: "Europe/Paris",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const nowIso = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;

    // Pre-compute a few reference examples so the model can't get confused
    // Example: "13 mars" → 2026-03-13 >= 2026-02-18 → futur → use 2026
    const marchExample = `${currentYear}-03-13`;
    const marchIsFuture = marchExample >= nowIso;
    const janExample = `${currentYear}-01-10`;
    const janIsFuture = janExample >= nowIso;

    const systemPrompt = `Tu es un assistant IA intelligent pour le tableau de bord Apidia.

**DATE ET HEURE ACTUELLES : ${parisTime} (heure de Paris) — date ISO : ${nowIso}**

## RÈGLES ABSOLUES SUR LES DATES ET PÉRIODES

**1. Toujours raisonner par rapport à la date du jour (${nowIso}) :**
- Si l'utilisateur pose une question touristique sans préciser de période, considère uniquement les informations **actuellement valides ou à venir**.
- Si une fiche contient des dates d'ouverture, de fermeture, ou des périodes d'événements, vérifie qu'elles sont **≥ aujourd'hui (${nowIso})** avant de les présenter comme des informations pertinentes.
- Si les données récupérées sont passées, indique-le clairement à l'utilisateur et précise qu'elles ne sont plus valides.

**2. Interprétation intelligente des dates sans année — RÈGLE ABSOLUE :**

AUJOURD'HUI = ${nowIso}. ANNÉE EN COURS = ${currentYear}. ANNÉE SUIVANTE = ${nextYear}.

Quand l'utilisateur mentionne une date SANS année (ex: "vendredi 13 mars", "le 15 août") :
- ÉTAPE 1 : Construis la date ISO avec l'année en cours → ex: "13 mars" = ${currentYear}-03-13
- ÉTAPE 2 : Compare cette date à ${nowIso} (aujourd'hui)
  - Si ${currentYear}-03-13 >= ${nowIso} → FUTUR → utilise ${currentYear} → date = ${currentYear}-03-13 ✓
  - Si ${currentYear}-03-13 < ${nowIso} → PASSÉ → utilise ${nextYear} → date = ${nextYear}-03-13 ✓

EXEMPLES CALCULÉS MAINTENANT (résultats définitifs, ne pas recalculer) :
- "13 mars" → ${currentYear}-03-13 ${marchIsFuture ? ">=" : "<"} ${nowIso} → ${marchIsFuture ? "FUTUR" : "PASSÉ"} → utilise **${marchIsFuture ? currentYear : nextYear}** → date = **${marchIsFuture ? currentYear : nextYear}-03-13**
- "10 janvier" → ${currentYear}-01-10 ${janIsFuture ? ">=" : "<"} ${nowIso} → ${janIsFuture ? "FUTUR" : "PASSÉ"} → utilise **${janIsFuture ? currentYear : nextYear}** → date = **${janIsFuture ? currentYear : nextYear}-01-10**

Pour tout autre mois/jour : applique la même logique. Construis ${currentYear}-MM-DD, compare à ${nowIso}, si >= utilise ${currentYear}, sinon utilise ${nextYear}.

**⛔ INTERDIT ABSOLU : Ne jamais demander à l'utilisateur de confirmer ou préciser l'année. Jamais. Toujours déduire automatiquement.**
- Convertis les expressions relatives en dates concrètes : "cet été" = juin à août ${currentYear}, "la semaine prochaine" = du ${new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]}, etc.

**3. Respecter la période demandée par l'utilisateur :**
- Si l'utilisateur précise une période ("cet été", "en août", "pour les vacances de Noël", "la semaine prochaine", etc.), interprète cette période en tenant compte de la date actuelle et filtre/présente les résultats en conséquence.
- Si une fiche ne couvre pas la période demandée, ne la présente pas comme une option valide.

**4. RÈGLE ABSOLUE pour "que faire / quoi faire" à une date précise :**
- Présente UNIQUEMENT les événements (FETE_ET_MANIFESTATION) et activités (ACTIVITE) qui se déroulent exactement ce jour-là.
- N'inclus JAMAIS des hébergements, restaurants ou structures dans une réponse "que faire" — sauf si l'utilisateur le demande explicitement.
- Tu dois toujours faire 2 requêtes séparées : une pour FETE_ET_MANIFESTATION, une pour ACTIVITE, toutes deux avec date_active.

**4. Pour les fiches FETE_ET_MANIFESTATION notamment :**
- Ne jamais recommander un événement dont la date de fin est passée.
- Toujours préciser les dates de l'événement dans ta réponse.

Tu as trois types de capacités :

**1. CONSULTATION DE DONNÉES (via les outils query_*)**
Tu peux interroger directement :

*Base de données Apidia :*
- Tâches (query_tasks) : suivi des tâches avec statut, priorité, dates
- Plannings éditoriaux (query_plannings) : planification de contenu
- Demandes utilisateurs (query_user_requests) : demandes de modifications de fiches
- Notes Google (query_google_ratings) : notes et avis Google des établissements
- Logs d'actions (query_action_logs) : historique des actions utilisateurs
- Fiches Apidae (query_fiches_apidae) : ~5000 fiches touristiques synchronisées depuis Apidae, recherche par nom, type (STRUCTURE, RESTAURATION, HEBERGEMENT_LOCATIF, etc.), commune, source

*Google Sheets :*
- Fiches touristiques (query_fiches_sheets) : BD COS, BD FETE_ET_MANIFESTATION
- Statistiques web (query_stats_web) : utilisateurs actifs, sessions, pages vues par site (Gréoux-les-Bains, Manosque, etc.) et par période
- E-réputation (query_stats_ereputation) : statistiques de réputation
- Données RH (query_rh_data) : informations RH

**2. INFORMATIONS APIDIA (via get_apidia_info)**
Utilise cet outil quand l'utilisateur pose des questions sur Apidia, ses fonctionnalités, ou ce que la plateforme peut faire.

**3. AUTOMATISATIONS MAKE (via call_make_webhook)**
⚡ Tu PEUX et DOIS utiliser cet outil pour :
- **Envoyer des emails** à n'importe quelle adresse (action: "Envoyer un email")
- **Créer des pages Notion** 
- **Créer des designs Canva** : affiches, posts Instagram/Facebook, présentations, visuels (action: "Créer un design Canva")
- **Envoyer des notifications** (Slack, Teams, etc.)
- **Exporter des données** vers d'autres services

**EXEMPLE : Demande d'envoi d'email avec des stats**
"Envoie les utilisateurs actifs 2025 de Gréoux par email à user@email.com"
→ Étape 1 : query_stats_web(site_name: "Gréoux", limit: 100) pour récupérer les données
→ Étape 2 : Filtrer/calculer les stats pour l'année 2025
→ Étape 3 : call_make_webhook avec :
   - action: "Envoyer un email"
   - data: { email: "user@email.com", subject: "Stats Gréoux 2025", content: "<données formatées>" }

⚠️ **RÈGLE CRITIQUE POUR MAKE :**
Make n'a PAS accès aux données d'Apidia. Tu DOIS :
1. Récupérer D'ABORD les données avec query_* ou get_apidia_info
2. Formater les données de manière lisible
3. Inclure le contenu COMPLET dans le paramètre 'data' du webhook

**RÈGLES GÉNÉRALES :**
- Tu PEUX envoyer des emails → utilise call_make_webhook avec action "Envoyer un email"
- Tu PEUX récupérer des stats par site et par année → utilise query_stats_web avec site_name
- Sois précis et donne des chiffres concrets
- Réponds toujours en français

**⚠️ RÉPONSE MAKE OBLIGATOIRE :**
Quand tu reçois une réponse de call_make_webhook, transmets le contenu de 'make_response' à l'utilisateur tel quel.`;

    // Initial AI call with tools
    let aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("Calling AI with messages:", aiMessages.length);

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes dépassée, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;
    
    // Handle tool calls in a loop (max 5 iterations to prevent infinite loops)
    let iterations = 0;
    while (assistantMessage?.tool_calls && iterations < 5) {
      iterations++;
      console.log(`Tool calls iteration ${iterations}:`, assistantMessage.tool_calls.length);
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall: any) => {
          const args = JSON.parse(toolCall.function.arguments || "{}");
          const result = await executeTool(toolCall.function.name, args, supabaseAdmin, threadId || "", fichesPreviews);
          return {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          };
        })
      );

      // Add assistant message and tool results to conversation
      aiMessages.push(assistantMessage);
      aiMessages.push(...toolResults);

      // Continue conversation with tool results
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          tools: tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error on iteration:", errorText);
        break;
      }

      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    const finalContent = assistantMessage?.content || "Je n'ai pas pu traiter votre demande.";
    console.log("Final response length:", finalContent.length);
    console.log("Fiches previews count:", fichesPreviews.length);

    // Deduplicate previews by fiche_id (in case of multiple tool calls)
    const seenIds = new Set<string>();
    const uniquePreviews = fichesPreviews.filter((f) => {
      if (seenIds.has(f.fiche_id)) return false;
      seenIds.add(f.fiche_id);
      return true;
    });

    return new Response(
      JSON.stringify({ response: finalContent, fiches_previews: uniquePreviews }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in make-chat function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
