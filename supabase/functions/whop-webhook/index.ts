import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map Whop product paths to token amounts
const PRODUCT_TOKEN_MAP: Record<string, number> = {
  "100-tokens-e88c": 100,
  "300-tokens": 300,
  "1000-tokens-3249": 1000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY");
    if (!WHOP_API_KEY) throw new Error("WHOP_API_KEY not configured");

    const body = await req.json();
    console.log("Whop webhook received:", JSON.stringify(body));

    const action = body.action;
    const data = body.data;

    // We handle payment.succeeded or membership.went_valid
    if (action !== "payment.succeeded" && action !== "membership.went_valid") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract session_id from metadata
    const sessionId = data?.metadata?.session_id;
    if (!sessionId) {
      console.error("No session_id in webhook metadata:", JSON.stringify(data?.metadata));
      return new Response(JSON.stringify({ error: "Missing session_id in metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine token amount from product or plan
    let tokensToAdd = 0;
    const productPath = data?.product?.path || data?.plan?.product?.path || "";
    for (const [key, amount] of Object.entries(PRODUCT_TOKEN_MAP)) {
      if (productPath.includes(key)) {
        tokensToAdd = amount;
        break;
      }
    }

    // Fallback: check amount
    if (tokensToAdd === 0) {
      const amount = data?.final_amount || data?.amount || 0;
      if (amount <= 250) tokensToAdd = 100;
      else if (amount <= 600) tokensToAdd = 300;
      else tokensToAdd = 1000;
      console.log(`Fallback token mapping: amount=${amount}, tokens=${tokensToAdd}`);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current wallet
    let { data: wallet } = await supabase
      .from("token_wallets")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from("token_wallets")
        .insert({ session_id: sessionId, tokens: 40 + tokensToAdd })
        .select()
        .single();
      wallet = newWallet;
    } else {
      const { data: updated } = await supabase
        .from("token_wallets")
        .update({ tokens: wallet.tokens + tokensToAdd })
        .eq("session_id", sessionId)
        .select()
        .single();
      wallet = updated;
    }

    console.log(`Added ${tokensToAdd} tokens for session ${sessionId}. New balance: ${wallet?.tokens}`);

    return new Response(
      JSON.stringify({ ok: true, tokensAdded: tokensToAdd, newBalance: wallet?.tokens }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("whop-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
