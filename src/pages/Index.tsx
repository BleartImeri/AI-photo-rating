import { useState } from "react";
import { Camera, Sparkles, Loader2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { TokenBar } from "@/components/TokenBar";
import { UploadZone } from "@/components/UploadZone";
import { ResultsPanel } from "@/components/ResultsPanel";
import { BuyTokensModal } from "@/components/BuyTokensModal";
import { useToast } from "@/hooks/use-toast";

type AnalysisResult = {
  overallScore: number;
  overallComment: string;
  categories: { name: string; score: number; icon: string; comment: string }[];
  topTips: string[];
};

export default function Index() {
  const { sessionId, wallet, refetch } = useWallet();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: "No photo selected", description: "Please upload a photo first.", variant: "destructive" });
      return;
    }
    if (wallet.tokens < 20) {
      setBuyOpen(true);
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-photo", {
        body: { imageBase64: base64, sessionId },
      });

      if (error) throw error;

      if (data?.error === "insufficient_tokens") {
        setBuyOpen(true);
        toast({
          title: "Not enough tokens",
          description: `Refill in ${data.remainingMins} minutes, or buy more tokens.`,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data.result);
      await refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      if (msg.includes("429")) {
        toast({ title: "Rate limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
      } else {
        toast({ title: "Analysis failed", description: msg, variant: "destructive" });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const canAnalyze = !!file && !analyzing && wallet.tokens >= 20;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground tracking-tight">PhotoRater AI</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Instant AI photo critique</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block min-w-[220px]">
              <TokenBar tokens={wallet.tokens} remainingMs={wallet.remainingMs} loading={wallet.loading} />
            </div>
            <button
              onClick={() => setBuyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Buy tokens</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-8 px-4">
        {/* Mobile token bar */}
        <div className="sm:hidden mb-5">
          <TokenBar tokens={wallet.tokens} remainingMs={wallet.remainingMs} loading={wallet.loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-black text-foreground mb-1">Rate My Photo</h2>
              <p className="text-muted-foreground text-sm">
                Upload any photo and get instant AI feedback on lighting, sharpness, composition, and more.
              </p>
            </div>

            <UploadZone onFile={setFile} disabled={analyzing} />

            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all duration-200
                bg-primary text-primary-foreground
                hover:opacity-90 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed
                shadow-glow"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing your photo…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Photo · 20 tokens
                </>
              )}
            </button>

            {wallet.tokens < 20 && !wallet.loading && (
              <p className="text-center text-xs text-destructive">
                Not enough tokens.{" "}
                <button
                  className="underline font-semibold hover:text-destructive/80"
                  onClick={() => setBuyOpen(true)}
                >
                  Buy more
                </button>{" "}
                or wait for the free refill.
              </p>
            )}
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            {result ? (
              <>
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-1">Analysis Results</h2>
                  <p className="text-muted-foreground text-sm">Here's what the AI thinks about your photo.</p>
                </div>
                <ResultsPanel result={result} />
              </>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-8">
                {analyzing ? (
                  <>
                    <div className="p-4 rounded-full bg-primary/10 animate-pulse-glow">
                      <Sparkles className="w-8 h-8 text-primary animate-spin-slow" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Analyzing your photo…</p>
                      <p className="text-sm text-muted-foreground mt-1">Our AI is reviewing lighting, focus, composition & more</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-muted">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Results will appear here</p>
                      <p className="text-sm text-muted-foreground mt-1">Upload a photo and click Analyze to get started</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <BuyTokensModal open={buyOpen} onClose={() => setBuyOpen(false)} remainingMs={wallet.remainingMs} />
    </div>
  );
}
