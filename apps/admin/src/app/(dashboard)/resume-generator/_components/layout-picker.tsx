"use client";

import type { ResumeLayout } from "@portfolio/shared/schemas";
import { cn } from "@/lib/utils";

type Props = {
  layouts: ResumeLayout[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function LayoutPicker({ layouts, value, onChange, disabled }: Props) {
  if (layouts.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No layouts yet. Seed or clone one under Resume layouts.
      </p>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "border-border bg-background w-full rounded-md border px-3 py-2 text-sm",
        "focus:border-accent focus:outline-hidden",
      )}
    >
      {layouts.map((layout) => (
        <option key={layout.id} value={layout.id}>
          {layout.name}
          {layout.is_default ? " (Default)" : ""}
        </option>
      ))}
    </select>
  );
}
