"use client";

import type { OptionsState } from "./types";
import { cn } from "@/lib/utils";

type Props = {
  value: OptionsState;
  onChange: (next: OptionsState) => void;
  disabled?: boolean;
};

const inputCls = cn(
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
  "focus:border-accent focus:outline-hidden",
);

export function JobMetaFields({ value, onChange, disabled }: Props) {
  function set<K extends keyof OptionsState>(key: K, next: OptionsState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block text-xs">
        <span className="text-muted-foreground mb-1 block">Company</span>
        <input
          value={value.company}
          onChange={(e) => set("company", e.target.value)}
          disabled={disabled}
          placeholder="Optional"
          className={inputCls}
        />
      </label>
      <label className="block text-xs">
        <span className="text-muted-foreground mb-1 block">Role title</span>
        <input
          value={value.role}
          onChange={(e) => set("role", e.target.value)}
          disabled={disabled}
          placeholder="Optional"
          className={inputCls}
        />
      </label>
      <label className="block text-xs">
        <span className="text-muted-foreground mb-1 block">Hiring manager</span>
        <input
          value={value.hiringManager}
          onChange={(e) => set("hiringManager", e.target.value)}
          disabled={disabled}
          placeholder="Optional"
          className={inputCls}
        />
      </label>
    </div>
  );
}
