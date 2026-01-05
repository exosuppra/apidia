import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, threadId } = await req.json();
    const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");

    if (!MAKE_WEBHOOK_URL) {
      console.error("MAKE_WEBHOOK_URL is not configured");
      return new Response(
        JSON.stringify({ error: "Webhook Make non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending message to Make webhook:", message);

    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        threadId,
        timestamp: new Date().toISOString(),
        source: "apidia-dashboard",
      }),
    });

    let responseData;
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      responseData = await response.json();
    } else {
      const textResponse = await response.text();
      responseData = { response: textResponse || "Message envoyé avec succès" };
    }

    console.log("Make webhook response:", responseData);

    return new Response(
      JSON.stringify({ 
        response: responseData?.response || responseData?.message || responseData?.text || "Message traité par Make",
        raw: responseData 
      }),
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
