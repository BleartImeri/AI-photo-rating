import { cn } from "@/lib/utils";
import { Sun, Focus, LayoutGrid, Aperture, Palette, Waves, Lightbulb } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  sun: Sun,
  focus: Focus,
  layout: LayoutGrid,
  aperture: Aperture,
  palette: Palette,
  noise: Waves,
};

interface Category {
  name: string;
  score: number;
  icon: string;
  comment: string;
}

interface AnalysisResult {
  overallScore: number;
  overallComment: string;
  categories: Category[];
  topTips: string[];
}

interface ResultsPanelProps {
  result: AnalysisResult;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7
      ? "text-score-great bg-score-great/15 border-score-great/30"
      : score >= 5
      ? "text-score-ok bg-score-ok/15 border-score-ok/30"
      : "text-score-poor bg-score-poor/15 border-score-poor/30";

  return (
    <span className={cn("text-sm font-bold px-2 py-0.5 rounded-md border", color)}>
      {score}/10
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const colorClass =
    score >= 7 ? "bg-score-great" : score >= 5 ? "bg-score-ok" : "bg-score-poor";
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex-1">
      <div
        className={cn("h-full rounded-full transition-all duration-700", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function OverallRing({ score }: { score: number }) {
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const pct = score / 10;
  const dash = circ * pct;
  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(220 15% 18%)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-black text-foreground">{score}</div>
        <div className="text-xs text-muted-foreground font-medium">/10</div>
      </div>
    </div>
  );
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div className="animate-slide-up space-y-5">
      {/* Overall */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="shrink-0">
          <OverallRing score={result.overallScore} />
        </div>
        <div className="text-center sm:text-left min-w-0">
          <h2 className="text-xl font-bold text-foreground mb-1">Overall Score</h2>
          <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{result.overallComment}</p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">
          Detailed Breakdown
        </h3>
        {result.categories.map((cat) => {
          const Icon = ICONS[cat.icon] ?? Sun;
          return (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1">{cat.name}</span>
                <ScoreBar score={cat.score} />
                <ScoreBadge score={cat.score} />
              </div>
              <p className="text-xs text-muted-foreground pl-6 leading-relaxed">{cat.comment}</p>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      {result.topTips?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Top Tips to Improve
          </h3>
          <ul className="space-y-2.5">
            {result.topTips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
