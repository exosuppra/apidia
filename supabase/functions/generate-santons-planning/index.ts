import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { edition_id } = await req.json();
    if (!edition_id) throw new Error("edition_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch edition
    const { data: edition } = await supabase
      .from("santons_editions")
      .select("*")
      .eq("id", edition_id)
      .single();
    if (!edition) throw new Error("Edition not found");

    // Compute days
    const days: string[] = [];
    const start = new Date(edition.start_date);
    const end = new Date(edition.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split("T")[0]);
    }

    // Fetch benevoles
    const { data: benevoles } = await supabase
      .from("santons_benevoles")
      .select("*")
      .eq("edition_id", edition_id);

    // Fetch disponibilites
    const benIds = (benevoles || []).map((b: any) => b.id);
    const { data: dispos } = await supabase
      .from("santons_disponibilites")
      .select("*")
      .in("benevole_id", benIds);

    const dispoMap: Record<string, Record<string, boolean>> = {};
    (dispos || []).forEach((d: any) => {
      if (!dispoMap[d.benevole_id]) dispoMap[d.benevole_id] = {};
      dispoMap[d.benevole_id][d.jour] = d.disponible;
    });

    // Fetch santonniers
    const { data: santonniers } = await supabase
      .from("santons_santonniers")
      .select("*")
      .eq("edition_id", edition_id);

    // Fetch preferences
    const santIds = (santonniers || []).map((s: any) => s.id);
    const { data: prefs } = await supabase
      .from("santons_preferences")
      .select("*")
      .in("santonnier_id", santIds);

    const prefMap: Record<string, any> = {};
    (prefs || []).forEach((p: any) => {
      prefMap[p.santonnier_id] = p;
    });

    // Build data for AI
    const benevolesData = (benevoles || []).map((b: any) => ({
      id: b.id,
      nom: `${b.prenom || ""} ${b.nom}`.trim(),
      stand_souhaite: b.stand_souhaite,
      souhaite_etre_avec: b.souhaite_etre_avec,
      disponibilites: days.reduce((acc: any, day: string) => {
        acc[day] = dispoMap[b.id]?.[day] || false;
        return acc;
      }, {}),
    }));

    const santonniersData = (santonniers || []).map((s: any) => ({
      id: s.id,
      nom_stand: s.nom_stand,
      presence_info: s.presence_info,
      benevole_souhaite: prefMap[s.id]?.benevole_souhaite || null,
      benevole_non_souhaite: prefMap[s.id]?.benevole_non_souhaite || null,
    }));

    const prompt = `Tu es un algorithme d'optimisation de planning. Tu dois affecter des bénévoles aux stands de santonniers pour chaque jour de la foire.

JOURS DE LA FOIRE: ${JSON.stringify(days)}

BÉNÉVOLES (avec leurs disponibilités par jour, stand souhaité, et personne avec qui ils souhaitent être):
${JSON.stringify(benevolesData, null, 2)}

SANTONNIERS (stands avec préférences de bénévoles):
${JSON.stringify(santonniersData, null, 2)}

CONTRAINTES À RESPECTER (par ordre de priorité):
1. Un bénévole ne peut être affecté que les jours où il est disponible (disponibilites[jour] === true)
2. Un bénévole ne peut être affecté qu'à un seul stand par jour
3. NE PAS affecter un bénévole si le santonnier l'a listé comme "benevole_non_souhaite" (correspondance partielle sur le nom)
4. Privilégier le "stand_souhaite" du bénévole quand c'est possible
5. Essayer de mettre ensemble les bénévoles qui ont "souhaite_etre_avec" renseigné
6. Privilégier les "benevole_souhaite" des santonniers
7. Répartition équitable : chaque bénévole doit avoir un nombre de jours similaire
8. Chaque stand doit avoir au moins 1 bénévole par jour si possible

Retourne UNIQUEMENT un JSON array d'objets avec exactement ces champs:
[{"jour": "YYYY-MM-DD", "santonnier_id": "uuid", "benevole_id": "uuid"}]

Pas d'explication, pas de markdown, juste le JSON array.`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    let aiResponse: Response;

    if (LOVABLE_API_KEY) {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es un algorithme d'optimisation. Réponds uniquement en JSON valide." },
            { role: "user", content: prompt },
          ],
        }),
      });
    } else if (GEMINI_API_KEY) {
      aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
    } else {
      throw new Error("No AI API key configured");
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    let assignmentsRaw: any[];

    if (LOVABLE_API_KEY) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("AI did not return valid JSON array");
      assignmentsRaw = JSON.parse(jsonMatch[0]);
    } else {
      const aiData = await aiResponse.json();
      const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("AI did not return valid JSON array");
      assignmentsRaw = JSON.parse(jsonMatch[0]);
    }

    // Clear existing planning
    await supabase.from("santons_planning").delete().eq("edition_id", edition_id);

    // Validate and insert
    const validBenIds = new Set(benIds);
    const validSantIds = new Set(santIds);
    const validDays = new Set(days);

    const validAssignments = assignmentsRaw.filter(
      (a: any) =>
        validDays.has(a.jour) &&
        validSantIds.has(a.santonnier_id) &&
        validBenIds.has(a.benevole_id)
    );

    // Remove duplicates (same benevole same day)
    const seen = new Set<string>();
    const dedupedAssignments = validAssignments.filter((a: any) => {
      const key = `${a.jour}-${a.benevole_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (dedupedAssignments.length > 0) {
      const rows = dedupedAssignments.map((a: any) => ({
        edition_id,
        jour: a.jour,
        santonnier_id: a.santonnier_id,
        benevole_id: a.benevole_id,
      }));

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("santons_planning").insert(batch);
        if (error) console.error("Insert error:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        assignments_count: dedupedAssignments.length,
        total_from_ai: assignmentsRaw.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
