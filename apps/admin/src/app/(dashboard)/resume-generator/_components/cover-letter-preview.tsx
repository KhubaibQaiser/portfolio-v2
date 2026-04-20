"use client";

import type { CoverLetter } from "@portfolio/ai/schemas";
import { cn } from "@/lib/utils";

type Props = {
  value: CoverLetter | null;
  streaming?: boolean;
  onChange?: (next: CoverLetter) => void;
};

const textareaCls = cn(
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm",
  "focus:border-accent focus:outline-hidden",
);

export function CoverLetterPreview({ value, streaming, onChange }: Props) {
  if (!value) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No cover letter generated yet
        </p>
      </div>
    );
  }

  const c = value as Partial<CoverLetter>;
  const greeting = c.greeting ?? "";
  const body = c.body ?? [];
  const closing = c.closing ?? "";
  const signOff = c.signOff ?? "";

  const editable = !streaming && Boolean(onChange);

  function update(mutator: (draft: CoverLetter) => void) {
    if (!onChange) return;
    const clone = structuredClone(value) as CoverLetter;
    clone.greeting ??= "";
    clone.body ??= [];
    clone.closing ??= "";
    clone.signOff ??= "";
    mutator(clone);
    onChange(clone);
  }

  return (
    <div className="space-y-4">
      <input
        value={greeting}
        onChange={(e) => update((d) => (d.greeting = e.target.value))}
        disabled={!editable}
        className={textareaCls}
      />
      {body.map((para, i) => (
        <textarea
          key={i}
          value={para}
          onChange={(e) =>
            update((d) => {
              d.body[i] = e.target.value;
            })
          }
          rows={Math.max(3, Math.ceil(para.length / 80))}
          disabled={!editable}
          className={textareaCls}
        />
      ))}
      <textarea
        value={closing}
        onChange={(e) => update((d) => (d.closing = e.target.value))}
        rows={3}
        disabled={!editable}
        className={textareaCls}
      />
      <textarea
        value={signOff}
        onChange={(e) => update((d) => (d.signOff = e.target.value))}
        rows={2}
        disabled={!editable}
        className={textareaCls}
      />
    </div>
  );
}
