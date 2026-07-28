import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COOLDOWN_MS = 10 * 60 * 1000;
const REWARD = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let { data: wallet } = await supabase
      .from("token_wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from("token_wallets")
        .insert({ user_id: user.id, session_id: user.id, tokens: 40 })
        .select()
        .single();
      wallet = newWallet;
    }

    const now = Date.now();
    const lastAd = wallet.last_ad_reward_at ? new Date(wallet.last_ad_reward_at).getTime() : 0;
    const sinceLast = now - lastAd;

    if (lastAd && sinceLast < COOLDOWN_MS) {
      return new Response(
        JSON.stringify({
          error: "cooldown",
          remainingMs: COOLDOWN_MS - sinceLast,
          tokens: wallet.tokens,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated, error: updErr } = await supabase
      .from("token_wallets")
      .update({
        tokens: wallet.tokens + REWARD,
        last_ad_reward_at: new Date(now).toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        tokens: updated.tokens,
        rewarded: REWARD,
        adCooldownMs: COOLDOWN_MS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("claim-ad-reward error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
