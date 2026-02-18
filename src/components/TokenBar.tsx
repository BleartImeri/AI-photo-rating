import { Coins, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenBarProps {
  tokens: number;
  remainingMs: number;
  loading?: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function TokenBar({ tokens, remainingMs, loading }: TokenBarProps) {
  const MAX_TOKENS = 40;
  const pct = Math.min(100, (tokens / MAX_TOKENS) * 100);
  const isLow = tokens < 20;
  const isEmpty = tokens <= 0;

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-card">
      <Coins
        className={cn("w-5 h-5 shrink-0", isEmpty ? "text-destructive" : "text-primary")}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-foreground">
            {loading ? "—" : `${tokens} / ${MAX_TOKENS} tokens`}
          </span>
          {isEmpty && remainingMs > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Refill in {formatCountdown(remainingMs)}
            </span>
          )}
          {!isEmpty && (
            <span className="text-xs text-muted-foreground">20 per photo</span>
          )}
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isEmpty
                ? "bg-destructive"
                : isLow
                ? "bg-score-ok"
                : "bg-gradient-token"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
