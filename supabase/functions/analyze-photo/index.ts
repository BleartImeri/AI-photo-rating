import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, sessionId } = await req.json();

    if (!imageBase64 || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing imageBase64 or sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create wallet
    let { data: wallet } = await supabase
      .from("token_wallets")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from("token_wallets")
        .insert({ session_id: sessionId, tokens: 40 })
        .select()
        .single();
      wallet = newWallet;
    }

    const TOKEN_COST = 20;

    // Check tokens
    if (wallet.tokens < TOKEN_COST) {
      // Check if 2 hours have passed since last_refill_at
      const lastRefill = new Date(wallet.last_refill_at).getTime();
      const now = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      const remainingMs = twoHoursMs - (now - lastRefill);

      if (remainingMs > 0) {
        const remainingMins = Math.ceil(remainingMs / 60000);
        return new Response(
          JSON.stringify({
            error: "insufficient_tokens",
            remainingMs,
            remainingMins,
            tokens: wallet.tokens,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Refill tokens
        const { data: refilled } = await supabase
          .from("token_wallets")
          .update({ tokens: 40, last_refill_at: new Date().toISOString() })
          .eq("session_id", sessionId)
          .select()
          .single();
        wallet = refilled;
      }
    }

    // Call Lovable AI with vision
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Strip data URL prefix if present and get media type
    let base64Data = imageBase64;
    let mediaType = "image/jpeg";
    if (imageBase64.includes(",")) {
      const parts = imageBase64.split(",");
      const mimeMatch = parts[0].match(/data:([^;]+)/);
      if (mimeMatch) mediaType = mimeMatch[1];
      base64Data = parts[1];
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert photography critic. Analyze the uploaded photo and return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "overallScore": <integer 1-10>,
  "overallComment": "<one sentence summary>",
  "categories": [
    { "name": "Lighting", "score": <1-10>, "icon": "sun", "comment": "<specific actionable feedback>" },
    { "name": "Sharpness", "score": <1-10>, "icon": "focus", "comment": "<specific actionable feedback>" },
    { "name": "Composition", "score": <1-10>, "icon": "layout", "comment": "<specific actionable feedback>" },
    { "name": "Exposure", "score": <1-10>, "icon": "aperture", "comment": "<specific actionable feedback>" },
    { "name": "Color", "score": <1-10>, "icon": "palette", "comment": "<specific actionable feedback>" },
    { "name": "Noise/Grain", "score": <1-10>, "icon": "noise", "comment": "<specific actionable feedback>" }
  ],
  "topTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}
Be honest and specific. A score of 7+ is good. Below 5 needs major work. Always give actionable, concrete suggestions.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64Data}`,
                },
              },
              {
                type: "text",
                text: "Please analyze this photo and rate it as described.",
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    let result;
    try {
      // Strip possible markdown code fences
      const cleaned = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI JSON:", rawContent);
      throw new Error("AI returned invalid JSON");
    }

    // Deduct tokens
    const newTokens = wallet.tokens - TOKEN_COST;
    await supabase
      .from("token_wallets")
      .update({ tokens: newTokens })
      .eq("session_id", sessionId);

    // Save analysis
    await supabase.from("photo_analyses").insert({
      session_id: sessionId,
      overall_score: result.overallScore,
      result,
      tokens_spent: TOKEN_COST,
    });

    return new Response(
      JSON.stringify({ result, tokensRemaining: newTokens }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
