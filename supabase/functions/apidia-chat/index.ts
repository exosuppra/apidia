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
    const msgLower = lastUserMsg.toLowerCase();

    // --- Smart intent extraction ---
    // Detect fiche type from keywords
    const typeKeywords: Record<string, string[]> = {
      RESTAURATION: ["restaurant", "manger", "dîner", "déjeuner", "repas", "cuisine", "table", "resto", "pizz", "brasserie", "bistro", "gastronomie", "diner"],
      HEBERGEMENT_LOCATIF: ["hébergement", "dormir", "loger", "location", "gîte", "meublé", "appartement"],
      HOTELLERIE: ["hôtel", "hotel", "chambre d'hôte", "chambre d'hotes", "b&b"],
      HEBERGEMENT_COLLECTIF: ["camping", "camp", "mobil-home"],
      FETE_ET_MANIFESTATION: ["événement", "evenement", "fête", "festival", "concert", "spectacle", "marché", "brocante", "exposition", "sortie"],
      ACTIVITE: ["activité", "activite", "randonnée", "balade", "kayak", "escalade", "vélo", "vtt", "piscine", "loisir", "faire", "visite"],
      PATRIMOINE_CULTUREL: ["patrimoine", "musée", "château", "église", "monument", "culture", "histoire"],
      COMMERCE_ET_SERVICE: ["magasin", "boutique", "commerce", "service", "pharmacie"],
    };
    
    let detectedTypes: string[] = [];
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => msgLower.includes(kw))) {
        detectedTypes.push(type);
      }
    }

    // Detect commune from message
    const communes = ["manosque", "gréoux-les-bains", "gréoux", "greoux", "valensole", "oraison", "pierrevert", "sainte-tulle", "volx", "villeneuve", "quinson", "riez", "moustiers", "esparron", "montfuron", "dauphin", "saint-martin-de-brômes", "allemagne-en-provence", "corbières", "la brillanne", "niozelles"];
    let detectedCommune: string | null = null;
    for (const c of communes) {
      if (msgLower.includes(c)) {
        // Map short names to full commune names
        if (c === "gréoux" || c === "greoux") detectedCommune = "Gréoux-les-Bains";
        else if (c === "moustiers") detectedCommune = "Moustiers-Sainte-Marie";
        else detectedCommune = c.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
        break;
      }
    }

    // Detect if asking about today/tonight/now
    const dateKeywords = ["ce soir", "aujourd'hui", "maintenant", "ouvert", "en ce moment", "cette semaine", "demain"];
    const wantsDateFilter = dateKeywords.some(kw => msgLower.includes(kw));
    const today = new Date().toISOString().split("T")[0];

    // Extract meaningful search terms (remove common words)
    const stopWords = ["quels", "quel", "quelle", "quelles", "sont", "les", "des", "est", "ce", "cette", "soir", "aujourd", "hui", "à", "a", "de", "du", "le", "la", "un", "une", "pour", "en", "dans", "où", "ou", "il", "y", "qui", "que", "je", "on", "nous", "vous", "cherche", "veux", "voudrais", "peux", "peut", "faire", "aller", "avoir", "être"];
    const searchWords = lastUserMsg.split(/[\s,?!.']+/).filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
    const searchTerm = searchWords.slice(0, 3).join(" ").substring(0, 80) || null;

    console.log("Intent detection:", { detectedTypes, detectedCommune, wantsDateFilter, searchTerm });

    // --- Execute targeted searches ---
    const searchPromises: Promise<any>[] = [];
    
    if (detectedTypes.length > 0) {
      // Search each detected type separately for better results
      for (const type of detectedTypes.slice(0, 3)) {
        searchPromises.push(
          supabase.rpc("search_fiches_apidae", {
            p_fiche_type: type,
            p_commune: detectedCommune,
            p_limit: 20,
            ...(wantsDateFilter ? { p_date_active: today } : {}),
          }).then(r => r.data || [])
        );
        // Also search without date filter for completeness
        if (wantsDateFilter) {
          searchPromises.push(
            supabase.rpc("search_fiches_apidae", {
              p_fiche_type: type,
              p_commune: detectedCommune,
              p_limit: 20,
            }).then(r => r.data || [])
          );
        }
      }
    } else {
      // Generic search with extracted terms
      searchPromises.push(
        supabase.rpc("search_fiches_apidae", {
          p_search_term: searchTerm,
          p_commune: detectedCommune,
          p_limit: 15,
          ...(wantsDateFilter ? { p_date_active: today } : {}),
        }).then(r => r.data || [])
      );
      searchPromises.push(
        supabase.rpc("search_fiches_apidae", {
          p_search_term: searchTerm,
          p_commune: detectedCommune,
          p_limit: 15,
        }).then(r => r.data || [])
      );
    }

    const searchResults = await Promise.all(searchPromises);
    const allFiches = searchResults.flat();
    const uniqueFiches = allFiches.filter((f: any, i: number, arr: any[]) => arr.findIndex(x => x.fiche_id === f.fiche_id) === i).slice(0, 25);

    // Get full data for preview cards and opening hours context
    let fichePreviews: any[] = [];
    let fichesWithHours: any[] = [];
    if (uniqueFiches.length > 0) {
      const ficheIds = uniqueFiches.map((f: any) => f.fiche_id);
      const { data: fullFiches } = await supabase
        .from("fiches_data")
        .select("fiche_id, fiche_type, data")
        .in("fiche_id", ficheIds);

      if (fullFiches && fullFiches.length > 0) {
        fichePreviews = fullFiches.map(f => extractFichePreview(f.fiche_id, f.fiche_type, f.data)).slice(0, 10);
        fichesWithHours = fullFiches;
      }
    }

    // Build rich context with opening hours
    const fichesContext = uniqueFiches.length > 0
      ? uniqueFiches.map((f: any) => {
          const full = fichesWithHours.find((fh: any) => fh.fiche_id === f.fiche_id);
          let hoursInfo = "";
          if (full?.data?.ouverture?.periodesOuvertures) {
            const periodes = full.data.ouverture.periodesOuvertures;
            if (Array.isArray(periodes)) {
              const relevant = periodes.slice(0, 3).map((p: any) => {
                let info = `du ${p.dateDebut || "?"} au ${p.dateFin || "?"}`;
                if (p.horaireOuverture) info += ` (ouverture: ${p.horaireOuverture})`;
                if (p.horaireFermeture) info += ` (fermeture: ${p.horaireFermeture})`;
                if (p.complementHoraire?.libelleFr) info += ` - ${p.complementHoraire.libelleFr}`;
                return info;
              });
              hoursInfo = ` | Horaires: ${relevant.join("; ")}`;
            }
          }
          // Contact info
          let contactInfo = "";
          if (full?.data?.informations?.moyensCommunication) {
            const moyens = full.data.informations.moyensCommunication;
            const tel = moyens.find((m: any) => m.type?.id === 201);
            if (tel) contactInfo += ` | Tél: ${tel.coordonnees?.fr || ""}`;
          }
          // Address
          const adresse = full?.data?.localisation?.adresse?.adresse1 || "";
          
          return `- ${f.nom} (${f.fiche_type}) à ${f.commune} ${f.code_postal}${adresse ? `, ${adresse}` : ""}${contactInfo}${hoursInfo} : ${f.description_courte || f.description_detaillee?.substring(0, 200) || "Pas de description"}`;
        }).join("\n")
      : "Aucune fiche trouvée pour cette recherche.";

    const systemPrompt = `Tu es Apidia, un conseiller en séjour virtuel expert du Pays de Manosque et de ses alentours en Provence.
Tu travailles pour l'Office de Tourisme et des Congrès du Pays de Manosque. Tu es chaleureux, enthousiaste et tu connais parfaitement le territoire.
IMPORTANT : Ne mentionne JAMAIS le mot "Verdon". Tu es rattaché au Pays de Manosque et à la Provence.

RÈGLES IMPORTANTES :
- SOIS EXHAUSTIF : quand un visiteur pose une question, propose TOUTES les options pertinentes disponibles dans les données, pas une seule. Par exemple, s'il demande "où manger ?", liste TOUS les restaurants pertinents, pas juste un ou deux.
- Pour chaque option proposée, mets en avant ses PARTICULARITÉS : type de cuisine, ambiance, spécialités, fourchette de prix, localisation, ce qui la rend unique.
- Organise tes réponses de façon claire avec des catégories si nécessaire (par type, par budget, par localisation, etc.)
- Utilise les données touristiques ci-dessous pour recommander des activités, hébergements, restaurants et événements
- Si tu as des informations de la base de connaissances complémentaire, utilise-les en priorité
- Ne mentionne jamais "Apidae" ou "base de données" au visiteur
- Si tu ne sais pas, dis-le honnêtement et suggère de contacter l'office de tourisme au 04 92 72 16 00
- Formate tes réponses avec du markdown (titres, listes, gras) pour la lisibilité
- Sois proactif : propose des suggestions complémentaires et des alternatives
- IMPORTANT : quand tu recommandes un lieu ou un événement présent dans les données touristiques, mentionne son nom exact tel qu'il apparaît dans les données. Des cartes visuelles seront affichées automatiquement sous ta réponse avec les fiches correspondantes.
- Donne des détails pratiques quand disponibles : horaires, tarifs, adresse, téléphone

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
