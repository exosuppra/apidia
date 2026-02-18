import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, prompt } = await req.json();

    if (!title || !prompt) {
      return new Response(
        JSON.stringify({ error: "title et prompt sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = "Tu es un assistant qui rédige des descriptions de tâches professionnelles. Rédige une description concise et claire en français, en suivant les consignes de l'utilisateur. Ne dépasse pas 200 mots.";
    const userPrompt = `Titre de la tâche : ${title}\n\nConsignes : ${prompt}\n\nRédige une description.`;

    const callModel = async (model: string) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limit atteint, réessayez dans quelques instants.");
        if (response.status === 402) throw new Error("Crédits Lovable AI insuffisants.");
        const text = await response.text();
        throw new Error(`Erreur API (${response.status}): ${text}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    };

    const [proposalA, proposalB] = await Promise.all([
      callModel("openai/gpt-5-mini"),
      callModel("google/gemini-2.5-flash"),
    ]);

    return new Response(
      JSON.stringify({ proposalA, proposalB }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-task-description error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
