import { Clock, Coins, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuyTokensModalProps {
  open: boolean;
  onClose: () => void;
  remainingMs: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "soon";
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const PACKAGES = [
  { tokens: 100, price: "$1.99", popular: false },
  { tokens: 300, price: "$4.99", popular: true },
  { tokens: 1000, price: "$14.99", popular: false },
];

export function BuyTokensModal({ open, onClose, remainingMs }: BuyTokensModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-card w-full max-w-sm p-6 animate-slide-up">
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors"
          onClick={onClose}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary/20">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Get More Tokens</h2>
            <p className="text-xs text-muted-foreground">Each photo analysis costs 20 tokens</p>
          </div>
        </div>

        {/* Free refill info */}
        <div className="mb-5 p-3 rounded-xl bg-secondary/50 border border-border flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {remainingMs > 0
              ? `Free refill of 40 tokens in ${formatCountdown(remainingMs)}`
              : "Your tokens will auto-refill to 40 every 2 hours for free!"}
          </p>
        </div>

        <div className="space-y-3 mb-5">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.tokens}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-150",
                "hover:border-primary/60 hover:bg-primary/5",
                pkg.popular
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30"
              )}
              onClick={() => {
                window.open(
                  `https://link.payoneer.com/Token?t=20BB066D5B774ACAA6EF2C97DACB34E5&src=pl`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{pkg.tokens} Tokens</span>
                  {pkg.popular && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                      BEST VALUE
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{pkg.tokens / 20} photo analyses</span>
              </div>
              <span className="font-bold text-primary">{pkg.price}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pay via Payoneer · Send payment note with token package · Tokens added manually after confirmation
        </p>
      </div>
    </div>
  );
}
