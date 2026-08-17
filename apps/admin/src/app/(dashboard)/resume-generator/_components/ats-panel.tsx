"use client";

import type { AtsScore } from "@portfolio/ai/schemas";
import { Loader2, RefreshCw, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: AtsScore | null;
  busy?: boolean;
  canRun: boolean;
  canNudge: boolean;
  onRun: () => void;
  onNudge: () => void;
};

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-rose-600";
}

export function AtsPanel({ value, busy, canRun, canNudge, onRun, onNudge }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !canRun}
          className={cn(
            "border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-1.5",
            "hover:bg-muted/50 text-sm font-medium transition-colors",
            "disabled:opacity-50",
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {value ? "Rescore" : "Score resume"}
        </button>
        {value && (
          <button
            type="button"
            onClick={onNudge}
            disabled={busy || !canNudge}
            className={cn(
              "border-accent/30 bg-accent/5 flex items-center gap-2 rounded-lg border px-3 py-1.5",
              "text-accent hover:bg-accent/10 text-sm font-medium transition-colors",
              "disabled:opacity-50",
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Nudge to include missing keywords
          </button>
        )}
      </div>

      {!value ? (
        <div className="border-border/60 rounded-lg border border-dashed p-4 text-center">
          <p className="text-muted-foreground text-sm font-medium">No ATS score yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Generate a resume first, then run ATS scoring.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-border/60 bg-muted/10 flex items-center gap-4 rounded-lg border p-4">
            <p className={cn("text-4xl font-bold", scoreColor(value.score))}>
              {value.score}
            </p>
            <div className="text-muted-foreground text-xs">
              <p>
                Matched: <strong>{value.matchedKeywords.length}</strong>
              </p>
              <p>
                Missing: <strong>{value.missingKeywords.length}</strong>
              </p>
            </div>
          </div>

          <KeywordGroup title="Missing keywords" items={value.missingKeywords} />
          <KeywordGroup title="Matched keywords" items={value.matchedKeywords} muted />
          {value.suggestions.length > 0 && (
            <div>
              <h4 className="text-accent mb-2 text-xs font-semibold tracking-wider uppercase">
                Suggestions
              </h4>
              <ul className="space-y-1.5 text-sm">
                {value.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="border-border/60 bg-muted/10 text-muted-foreground rounded-md border px-3 py-2"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KeywordGroup({
  title,
  items,
  muted,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-accent mb-2 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h4>
      <p className="flex flex-wrap gap-1.5 text-xs">
        {items.map((k) => (
          <span
            key={k}
            className={cn(
              "rounded-full border px-2 py-0.5",
              muted
                ? "border-border/60 bg-muted/30 text-muted-foreground"
                : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
            )}
          >
            {k}
          </span>
        ))}
      </p>
    </div>
  );
}
