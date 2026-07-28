import { useEffect, useRef, useState } from "react";
import { X, Play, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onRewarded: () => void;
  cooldownRemainingMs: number;
}

const AD_DURATION = 15;

export function RewardedAdModal({ open, onClose, onRewarded, cooldownRemainingMs }: Props) {
  const { toast } = useToast();
  const [playing, setPlaying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION);
  const [claiming, setClaiming] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      setSecondsLeft(AD_DURATION);
      setClaiming(false);
      completedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!playing) return;
    if (secondsLeft <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        claimReward();
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [playing, secondsLeft]);

  const claimReward = async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-ad-reward", { body: {} });
      if (error) throw error;
      if (data?.error === "cooldown") {
        const mins = Math.ceil((data.remainingMs ?? 0) / 60000);
        toast({ title: "Please wait", description: `Try again in ${mins} min.`, variant: "destructive" });
      } else {
        toast({ title: "+20 tokens!", description: "Thanks for watching." });
        onRewarded();
        onClose();
      }
    } catch (e) {
      toast({
        title: "Couldn't grant reward",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const cooldownActive = cooldownRemainingMs > 0 && !playing;
  const cooldownMins = Math.ceil(cooldownRemainingMs / 60000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={playing && !completedRef.current}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {!playing ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Gift className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-black text-foreground">Watch an ad, earn 20 tokens</h2>
            <p className="text-sm text-muted-foreground">
              Watch a short {AD_DURATION}-second ad and we'll add 20 tokens to your wallet.
            </p>
            {cooldownActive ? (
              <p className="text-sm text-destructive font-semibold">
                Available again in {cooldownMins} min
              </p>
            ) : null}
            <button
              onClick={() => setPlaying(true)}
              disabled={cooldownActive}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {cooldownActive ? "On cooldown" : "Watch ad"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-primary/30 via-secondary to-primary/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 animate-pulse-glow" />
              <div className="relative z-10 text-center">
                {claiming ? (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                    <p className="mt-3 font-semibold text-foreground">Granting reward…</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-black text-foreground">{secondsLeft}s</p>
                    <p className="mt-2 text-sm text-muted-foreground">Ad playing…</p>
                  </>
                )}
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold tracking-wider">
                AD
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Please keep this window open until the ad finishes to receive your tokens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
