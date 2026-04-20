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

export function AtsPanel({
  value,
  busy,
  canRun,
  canNudge,
  onRun,
  onNudge,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !canRun}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5",
            "text-sm font-medium transition-colors hover:bg-muted/50",
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
              "flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5",
              "text-sm font-medium text-accent transition-colors hover:bg-accent/10",
              "disabled:opacity-50",
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Nudge to include missing keywords
          </button>
        )}
      </div>

      {!value ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No ATS score yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate a resume first, then run ATS scoring.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/10 p-4">
            <p className={cn("text-4xl font-bold", scoreColor(value.score))}>
              {value.score}
            </p>
            <div className="text-xs text-muted-foreground">
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
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
                Suggestions
              </h4>
              <ul className="space-y-1.5 text-sm">
                {value.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-muted-foreground"
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
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
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
