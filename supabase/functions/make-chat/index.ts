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
      name: "call_make_webhook",
      description: "Appelle le webhook Make pour exécuter des automatisations externes (envoi d'emails, intégrations tierces, workflows complexes, actions qui ne sont pas des requêtes de données). Utilise cet outil pour toute action qui nécessite une intégration externe.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", description: "L'action ou commande à exécuter via Make" },
          data: { type: "object", description: "Données additionnelles à envoyer au webhook" }
        },
        required: ["action"]
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
      description: "Récupère les statistiques web depuis Google Sheets (fréquentation des sites web).",
      parameters: {
        type: "object",
        properties: {
          site_name: { type: "string", description: "Nom du site spécifique" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 20)" }
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
  }
];

// Execute tool calls
async function executeTool(toolName: string, args: any, supabaseAdmin: any, threadId: string): Promise<string> {
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  try {
    switch (toolName) {
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
          responseData = { response: textResponse || "Action exécutée avec succès" };
        }
        
        console.log("Make webhook response:", responseData);
        return JSON.stringify(responseData);
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

    const systemPrompt = `Tu es un assistant IA intelligent pour le tableau de bord Apidia.

**DATE ET HEURE ACTUELLES : ${parisTime} (heure de Paris)**

Tu as deux types de capacités :

**1. AUTOMATISATIONS MAKE (via call_make_webhook)**
Utilise cet outil pour :
- Exécuter des workflows automatisés
- Envoyer des notifications ou emails
- Intégrations avec des services tiers
- Toute action qui nécessite une automatisation externe

**2. CONSULTATION DE DONNÉES (via les outils query_*)**
Tu peux interroger directement :

*Base de données Apidia :*
- Tâches (query_tasks) : suivi des tâches avec statut, priorité, dates
- Plannings éditoriaux (query_plannings) : planification de contenu
- Demandes utilisateurs (query_user_requests) : demandes de modifications de fiches
- Notes Google (query_google_ratings) : notes et avis Google des établissements
- Logs d'actions (query_action_logs) : historique des actions utilisateurs

*Google Sheets :*
- Fiches touristiques (query_fiches_sheets) : BD COS, BD FETE_ET_MANIFESTATION (établissements, événements)
- Statistiques web (query_stats_web) : données de fréquentation des sites
- E-réputation (query_stats_ereputation) : statistiques de réputation en ligne
- Données RH (query_rh_data) : informations sur les ressources humaines

**RÈGLES :**
- Pour les questions sur les données → utilise les outils query_*
- Pour les actions/automatisations → utilise call_make_webhook
- Sois précis et donne des chiffres concrets
- Réponds toujours en français
- Si tu ne trouves pas les données, indique-le clairement`;

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
          const result = await executeTool(toolCall.function.name, args, supabaseAdmin, threadId || "");
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

    return new Response(
      JSON.stringify({ response: finalContent }),
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
