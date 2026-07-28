import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface WalletState {
  tokens: number;
  remainingMs: number;
  adRemainingMs: number;
  loading: boolean;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletState>({ tokens: 40, remainingMs: 0, adRemainingMs: 0, loading: true });

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-wallet", { body: {} });
      if (error) throw error;
      setWallet({
        tokens: data.tokens,
        remainingMs: data.remainingMs ?? 0,
        adRemainingMs: data.adRemainingMs ?? 0,
        loading: false,
      });
    } catch (e) {
      console.error("fetchWallet error:", e);
      setWallet((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchWallet();
    const interval = setInterval(fetchWallet, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchWallet]);

  return { sessionId: user?.id ?? "", wallet, refetch: fetchWallet };
}
