import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active knowledge base entries
    const { data: knowledge } = await supabase
      .from("apidia_knowledge")
      .select("category, title, content")
      .eq("is_active", true)
      .order("category");

    const knowledgeText = knowledge && knowledge.length > 0
      ? knowledge.map(k => `[${k.category}] ${k.title}: ${k.content}`).join("\n")
      : "";

    // Extract search terms from last user message for Apidae lookup
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // Search Apidae data for relevant fiches
    const { data: fiches } = await supabase.rpc("search_fiches_apidae", {
      p_search_term: lastUserMsg.substring(0, 100),
      p_limit: 10,
      p_date_active: new Date().toISOString().split("T")[0],
    });

    // Also do a general search without date filter for non-event results
    const { data: fichesGeneral } = await supabase.rpc("search_fiches_apidae", {
      p_search_term: lastUserMsg.substring(0, 100),
      p_limit: 10,
    });

    const allFiches = [...(fiches || []), ...(fichesGeneral || [])];
    const uniqueFiches = allFiches.filter((f, i, arr) => arr.findIndex(x => x.fiche_id === f.fiche_id) === i).slice(0, 15);

    const fichesContext = uniqueFiches.length > 0
      ? uniqueFiches.map(f =>
        `- ${f.nom} (${f.fiche_type}) à ${f.commune} ${f.code_postal} : ${f.description_courte || f.description_detaillee?.substring(0, 200) || "Pas de description"}`
      ).join("\n")
      : "Aucune fiche trouvée pour cette recherche.";

    const systemPrompt = `Tu es Apidia, un conseiller en séjour virtuel expert du territoire du Verdon et de la Provence.
Tu travailles pour un Office de Tourisme. Tu es chaleureux, enthousiaste et tu connais parfaitement le territoire.

RÈGLES IMPORTANTES :
- Réponds de manière concise et naturelle, comme dans une vraie conversation
- Utilise les données Apidae ci-dessous pour recommander des activités, hébergements, restaurants et événements
- Si tu as des informations de la base de connaissances complémentaire, utilise-les en priorité
- Ne mentionne jamais "Apidae" ou "base de données" au visiteur
- Si tu ne sais pas, dis-le honnêtement et suggère de contacter l'office de tourisme
- Formate tes réponses avec du markdown (listes, gras) pour la lisibilité
- Sois proactif : propose des suggestions complémentaires

BASE DE CONNAISSANCES COMPLÉMENTAIRE :
${knowledgeText || "Aucune information complémentaire disponible."}

DONNÉES TOURISTIQUES PERTINENTES :
${fichesContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("apidia-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
