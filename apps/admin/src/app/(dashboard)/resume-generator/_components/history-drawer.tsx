"use client";

import type { HistoryItem } from "./types";
import { cn } from "@/lib/utils";

type Props = {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function HistoryDrawer({ items, activeId, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        No generations yet. Your last 20 runs will appear here.
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const d = new Date(item.createdAt);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                activeId === item.id
                  ? "border-accent/40 bg-accent/5"
                  : "border-border/60 bg-muted/10 hover:bg-muted/30",
              )}
            >
              <p className="font-medium">
                {item.role ?? "Untitled role"}
                {item.company ? ` · ${item.company}` : ""}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {d.toLocaleDateString()} ·{" "}
                {d.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.hasResume && "Resume"}
                {item.hasResume && item.hasCoverLetter && " · "}
                {item.hasCoverLetter && "Cover"}
                {item.hasAts && " · ATS"}
                {item.fallbackUsed && " · ↓ fallback"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
