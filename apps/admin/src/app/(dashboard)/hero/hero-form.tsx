"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveHero } from "@/lib/actions";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Hero = Database["public"]["Tables"]["hero"]["Row"];

type HeroFormProps = {
  initialData: Hero | null;
};

export function HeroForm({ initialData }: HeroFormProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    greeting: initialData?.greeting ?? "Hi, my name is",
    name: initialData?.name ?? "",
    headline: initialData?.headline ?? "",
    subtitle: initialData?.subtitle ?? [],
    value_proposition: initialData?.value_proposition ?? "",
    cta_primary_text: initialData?.cta_primary_text ?? "View My Work",
    cta_secondary_text: initialData?.cta_secondary_text ?? "Download Resume",
  });

  function handleChange(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveHero(form);
    setSaving(false);
    setMessage(result.success ? "Saved!" : result.error);
  }

  return (
    <div className="mt-8 space-y-5">
      {(["greeting", "name", "headline", "value_proposition", "cta_primary_text", "cta_secondary_text"] as const).map(
        (key) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            {String(form[key]).length > 80 ? (
              <textarea
                value={form[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={3}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm focus:border-accent focus:outline-none",
                )}
              />
            ) : (
              <input
                value={form[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm focus:border-accent focus:outline-none",
                )}
              />
            )}
          </div>
        ),
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Subtitles (one per line)
        </label>
        <textarea
          value={form.subtitle.join("\n")}
          onChange={(e) =>
            handleChange(
              "subtitle",
              e.target.value.split("\n").filter((s) => s.trim()),
            )
          }
          rows={3}
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-none",
          )}
        />
      </div>

      {message && (
        <p className={cn("text-sm", message === "Saved!" ? "text-green-600" : "text-red-500")}>
          {message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5",
          "text-sm font-medium text-accent-foreground transition-opacity",
          "hover:opacity-90 disabled:opacity-50",
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save & Publish"}
      </button>
    </div>
  );
}
