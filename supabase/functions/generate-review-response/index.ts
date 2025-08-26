import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reviewText, rating, businessName } = await req.json();

    if (!reviewText || !rating) {
      return new Response(JSON.stringify({ error: 'Review text and rating are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 3 different response options
    const prompt = `Tu es un assistant qui aide les entreprises à répondre à leurs avis Google My Business de manière professionnelle et personnalisée.

Entreprise: ${businessName || 'cette entreprise'}
Avis reçu (${rating}/5 étoiles): "${reviewText}"

Génère 3 réponses différentes pour cet avis:
1. Une réponse chaleureuse et personnelle
2. Une réponse professionnelle et concise  
3. Une réponse empathique avec une invitation

Chaque réponse doit:
- Être authentique et naturelle
- Remercier le client
- Faire max 2-3 phrases
- Être adaptée à la note (positive/négative)
- Inclure une invitation subtile si approprié

Format de réponse:
RÉPONSE 1: [réponse]
RÉPONSE 2: [réponse]  
RÉPONSE 3: [réponse]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: 'Tu es un expert en relation client qui aide à rédiger des réponses professionnelles aux avis Google My Business.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return new Response(JSON.stringify({ error: 'Failed to generate responses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedText = data.choices[0].message.content;
    
    // Parse the responses
    const responses = [];
    const lines = generatedText.split('\n');
    let currentResponse = '';
    
    for (const line of lines) {
      if (line.startsWith('RÉPONSE')) {
        if (currentResponse) {
          responses.push(currentResponse.trim());
        }
        currentResponse = line.replace(/RÉPONSE \d+:\s*/, '');
      } else if (line.trim() && currentResponse) {
        currentResponse += ' ' + line.trim();
      }
    }
    
    if (currentResponse) {
      responses.push(currentResponse.trim());
    }

    // Ensure we have 3 responses
    while (responses.length < 3) {
      responses.push('Merci pour votre avis, nous apprécions votre retour !');
    }

    return new Response(JSON.stringify({ 
      responses: responses.slice(0, 3) 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-review-response:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});