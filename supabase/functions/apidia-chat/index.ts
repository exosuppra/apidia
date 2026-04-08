import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractFichePreview(ficheId: string, ficheType: string, data: any) {
  const nom = data?.nom?.libelleFr || data?.nom?.libelleEn || "Sans nom";
  const commune = data?.localisation?.adresse?.commune?.nom || "";
  const codePostal = data?.localisation?.adresse?.codePostal || "";
  const adresse = [
    data?.localisation?.adresse?.adresse1,
    data?.localisation?.adresse?.adresse2,
  ].filter(Boolean).join(", ");

  const descCourte = data?.presentation?.descriptifCourt?.libelleFr || "";
  const descDetaillee = data?.presentation?.descriptifDetaille?.libelleFr || "";
  const description = descCourte || (descDetaillee ? descDetaillee.substring(0, 300) : "");

  // Image
  let imageUrl = "";
  const illustrations = data?.illustrations;
  if (Array.isArray(illustrations) && illustrations.length > 0) {
    const traductionFichiers = illustrations[0]?.traductionFichiers;
    if (Array.isArray(traductionFichiers) && traductionFichiers.length > 0) {
      imageUrl = traductionFichiers[0]?.url || "";
      if (imageUrl && !imageUrl.includes("apidata.atout-france")) {
        imageUrl = imageUrl.replace(/\/[^\/]*$/, "/300x200.jpg");
      }
    }
  }

  // Contact
  let telephone = "";
  let email = "";
  let siteWeb = "";
  const moyens = data?.informations?.moyensCommunication;
  if (Array.isArray(moyens)) {
    for (const m of moyens) {
      const type = m?.type?.id;
      if (type === 201 && !telephone) telephone = m.coordonnees?.fr || "";
      if (type === 204 && !email) email = m.coordonnees?.fr || "";
      if (type === 205 && !siteWeb) siteWeb = m.coordonnees?.fr || "";
    }
  }

  // Dates (for events)
  let dateDebut = "";
  let dateFin = "";
  let heureDebut = "";
  const periodes = data?.ouverture?.periodesOuvertures;
  if (Array.isArray(periodes) && periodes.length > 0) {
    const now = new Date().toISOString().split("T")[0];
    const activePeriod = periodes.find((p: any) => p.dateDebut <= now && p.dateFin >= now) || periodes[0];
    dateDebut = activePeriod?.dateDebut || "";
    dateFin = activePeriod?.dateFin || "";
    heureDebut = activePeriod?.horaireOuverture || "";
  }

  // Tarif
  let tarif = "";
  const periodesTarifs = data?.descriptionTarif?.periodes;
  if (Array.isArray(periodesTarifs) && periodesTarifs.length > 0) {
    const t = periodesTarifs[0]?.tarifs;
    if (Array.isArray(t) && t.length > 0) {
      const min = t[0]?.minimum;
      const max = t[0]?.maximum;
      if (min && max && min !== max) tarif = `${min}€ - ${max}€`;
      else if (min) tarif = `${min}€`;
    }
    if (!tarif) {
      const complement = data?.descriptionTarif?.complement?.libelleFr;
      if (complement) tarif = complement.substring(0, 60);
    }
  }

  return {
    fiche_id: ficheId,
    nom,
    type: ficheType,
    commune,
    code_postal: codePostal,
    adresse,
    description,
    image_url: imageUrl,
    telephone,
    email,
    site_web: siteWeb,
    date_debut: dateDebut,
    date_fin: dateFin,
    heure_debut: heureDebut,
    tarif,
  };
}

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

    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // Search Apidae data
    const { data: fiches } = await supabase.rpc("search_fiches_apidae", {
      p_search_term: lastUserMsg.substring(0, 100),
      p_limit: 10,
      p_date_active: new Date().toISOString().split("T")[0],
    });

    const { data: fichesGeneral } = await supabase.rpc("search_fiches_apidae", {
      p_search_term: lastUserMsg.substring(0, 100),
      p_limit: 10,
    });

    const allFiches = [...(fiches || []), ...(fichesGeneral || [])];
    const uniqueFiches = allFiches.filter((f, i, arr) => arr.findIndex(x => x.fiche_id === f.fiche_id) === i).slice(0, 15);

    // Get full data for preview cards
    let fichePreviews: any[] = [];
    if (uniqueFiches.length > 0) {
      const ficheIds = uniqueFiches.map(f => f.fiche_id);
      const { data: fullFiches } = await supabase
        .from("fiches_data")
        .select("fiche_id, fiche_type, data")
        .in("fiche_id", ficheIds);

      if (fullFiches && fullFiches.length > 0) {
        fichePreviews = fullFiches.map(f => extractFichePreview(f.fiche_id, f.fiche_type, f.data)).slice(0, 8);
      }
    }

    const fichesContext = uniqueFiches.length > 0
      ? uniqueFiches.map(f =>
        `- ${f.nom} (${f.fiche_type}) à ${f.commune} ${f.code_postal} : ${f.description_courte || f.description_detaillee?.substring(0, 200) || "Pas de description"}`
      ).join("\n")
      : "Aucune fiche trouvée pour cette recherche.";

    const systemPrompt = `Tu es Apidia, un conseiller en séjour virtuel expert du territoire du Verdon et de la Provence.
Tu travailles pour un Office de Tourisme. Tu es chaleureux, enthousiaste et tu connais parfaitement le territoire.

RÈGLES IMPORTANTES :
- Réponds de manière concise et naturelle, comme dans une vraie conversation
- Utilise les données touristiques ci-dessous pour recommander des activités, hébergements, restaurants et événements
- Si tu as des informations de la base de connaissances complémentaire, utilise-les en priorité
- Ne mentionne jamais "Apidae" ou "base de données" au visiteur
- Si tu ne sais pas, dis-le honnêtement et suggère de contacter l'office de tourisme
- Formate tes réponses avec du markdown (listes, gras) pour la lisibilité
- Sois proactif : propose des suggestions complémentaires
- IMPORTANT : quand tu recommandes un lieu ou un événement présent dans les données touristiques, mentionne son nom exact tel qu'il apparaît dans les données. Des cartes visuelles seront affichées automatiquement sous ta réponse avec les fiches correspondantes.

BASE DE CONNAISSANCES COMPLÉMENTAIRE :
${knowledgeText || "Aucune information complémentaire disponible."}

DONNÉES TOURISTIQUES PERTINENTES :
${fichesContext}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a custom stream: first emit fiches_previews, then pipe AI stream
    const aiBody = aiResponse.body!;
    const customStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Emit fiches previews as first SSE event
        if (fichePreviews.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ fiches_previews: fichePreviews })}\n\n`));
        }

        // Pipe AI stream
        const reader = aiBody.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("apidia-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
