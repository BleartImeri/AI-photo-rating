import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user from the Authorization header
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

    const lastRefill = new Date(wallet.last_refill_at).getTime();
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (wallet.tokens < 40 && now - lastRefill >= twoHoursMs) {
      const { data: refilled } = await supabase
        .from("token_wallets")
        .update({ tokens: 40, last_refill_at: new Date().toISOString() })
        .eq("user_id", user.id)
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
