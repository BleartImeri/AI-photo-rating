import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "photo_rater_session_id";

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface WalletState {
  tokens: number;
  remainingMs: number;
  loading: boolean;
}

export function useWallet() {
  const sessionId = getOrCreateSessionId();
  const [wallet, setWallet] = useState<WalletState>({ tokens: 40, remainingMs: 0, loading: true });

  const fetchWallet = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-wallet", {
        body: { sessionId },
      });
      if (error) throw error;
      setWallet({ tokens: data.tokens, remainingMs: data.remainingMs ?? 0, loading: false });
    } catch (e) {
      console.error("fetchWallet error:", e);
      setWallet((prev) => ({ ...prev, loading: false }));
    }
  }, [sessionId]);

  useEffect(() => {
    fetchWallet();
    // Refresh every 30s
    const interval = setInterval(fetchWallet, 30_000);
    return () => clearInterval(interval);
  }, [fetchWallet]);

  return { sessionId, wallet, refetch: fetchWallet };
}

export { getOrCreateSessionId };
