import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Auto-refill check
    const lastRefill = new Date(wallet.last_refill_at).getTime();
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (wallet.tokens < 40 && now - lastRefill >= twoHoursMs) {
      const { data: refilled } = await supabase
        .from("token_wallets")
        .update({ tokens: 40, last_refill_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .select()
        .single();
      wallet = refilled;
    }

    const remainingMs = Math.max(0, twoHoursMs - (now - lastRefill));

    return new Response(
      JSON.stringify({ tokens: wallet.tokens, lastRefillAt: wallet.last_refill_at, remainingMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-wallet error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
