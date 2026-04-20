"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  label: string;
  hint?: string;
};

const RESUME_ITEMS: Item[] = [
  {
    id: "facts",
    label: "Every bullet maps to something you actually did",
    hint: "No invented employer, role, metric, or tech.",
  },
  {
    id: "voice",
    label: "Read it aloud — does it sound like you?",
    hint: "Swap stiff corporate phrases for how you actually talk.",
  },
  {
    id: "specifics",
    label: "Replace vague adjectives with concrete numbers or scope",
    hint: '"improved" → "cut p95 by 40% on 3M req/day"',
  },
  {
    id: "tailor",
    label: "Summary + top 3 bullets echo the JD's language",
    hint: "Without keyword stuffing.",
  },
  {
    id: "length",
    label: "No single bullet runs past 2 lines",
    hint: "Tighten or split long ones.",
  },
];

const COVER_ITEMS: Item[] = [
  {
    id: "opener",
    label: "Opening line is not a template",
    hint: 'Avoid "I am writing to apply…" and "I was excited to see…".',
  },
  {
    id: "why-you",
    label: "Mentions something specific about the company or role",
    hint: "Product, team, mission — proves you read the JD.",
  },
  {
    id: "proof",
    label: "Includes at least one concrete result you've shipped",
    hint: "A number, a user outcome, or a named project.",
  },
  {
    id: "voice",
    label: "Sounds human, not robotic",
    hint: "No em-dash triplets, no \"I am passionate about…\" filler.",
  },
  {
    id: "signoff",
    label: "Sign-off matches the greeting register",
    hint: '"Hi Sarah," → "Thanks," / "Dear Hiring Manager," → "Sincerely,"',
  },
];

type Props = {
  kind: "resume" | "cover_letter";
};

export function PolishChecklist({ kind }: Props) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const items = kind === "resume" ? RESUME_ITEMS : COVER_ITEMS;
  const progress = `${checked.size}/${items.length}`;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span>Human-polish checklist</span>
        <span className="ml-auto text-muted-foreground">{progress}</span>
      </button>

      {open && (
        <ul className="space-y-1 border-t border-border/60 p-2">
          {items.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      isChecked
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border",
                    )}
                    aria-hidden
                  >
                    {isChecked && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span>
                    <span
                      className={cn(
                        isChecked && "line-through text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.hint && (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {item.hint}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
