"use client";

import type { ResumeLayout } from "@portfolio/shared/schemas";
import { cn } from "@/lib/utils";

type Props = {
  layout: ResumeLayout;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  busy?: boolean;
};

export function LayoutCard({ layout, onEdit, onSetDefault, onDelete, busy }: Props) {
  return (
    <article className="border-border bg-muted/10 flex flex-col rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{layout.name}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            v{layout.version} · {layout.component_key}
          </p>
        </div>
        {layout.is_default ? (
          <span className="bg-accent/10 text-accent rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase">
            Default
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-3 flex-1 text-sm">{layout.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-xs"
        >
          Edit guidelines
        </button>
        {!layout.is_default ? (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={busy}
            className="bg-accent text-accent-foreground rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            Set as default
          </button>
        ) : null}
        {!layout.is_default ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs",
              "border-destructive/30 text-destructive hover:bg-destructive/5 disabled:opacity-50",
            )}
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}
