"use client";

import type { Language, Length, OptionsState, Tone } from "./types";
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

export function OptionsForm({ value, onChange, disabled }: Props) {
  function set<K extends keyof OptionsState>(key: K, next: OptionsState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Company">
        <input
          value={value.company}
          onChange={(e) => set("company", e.target.value)}
          disabled={disabled}
          placeholder="Acme Inc."
          className={inputCls}
        />
      </Field>
      <Field label="Role">
        <input
          value={value.role}
          onChange={(e) => set("role", e.target.value)}
          disabled={disabled}
          placeholder="Senior Frontend Engineer"
          className={inputCls}
        />
      </Field>
      <Field label="Hiring manager (optional)">
        <input
          value={value.hiringManager}
          onChange={(e) => set("hiringManager", e.target.value)}
          disabled={disabled}
          placeholder="Alex Jordan"
          className={inputCls}
        />
      </Field>
      <Field label="Language">
        <select
          value={value.language}
          onChange={(e) => set("language", e.target.value as Language)}
          disabled={disabled}
          className={inputCls}
        >
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
        </select>
      </Field>
      <Field label="Tone">
        <select
          value={value.tone}
          onChange={(e) => set("tone", e.target.value as Tone | "")}
          disabled={disabled}
          className={inputCls}
        >
          <option value="">Auto</option>
          <option value="formal">Formal</option>
          <option value="friendly">Friendly</option>
          <option value="enthusiastic">Enthusiastic</option>
        </select>
      </Field>
      <Field label="Length">
        <select
          value={value.length}
          onChange={(e) => set("length", e.target.value as Length | "")}
          disabled={disabled}
          className={inputCls}
        >
          <option value="">Auto</option>
          <option value="short">Short</option>
          <option value="standard">Standard</option>
          <option value="detailed">Detailed</option>
        </select>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
