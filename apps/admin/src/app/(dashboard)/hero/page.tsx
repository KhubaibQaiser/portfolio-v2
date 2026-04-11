"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HeroEditPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    greeting: "Hi, my name is",
    name: "Khubaib Qaiser",
    headline: "I build things for the web & beyond.",
    value_proposition:
      "11 years. 6 companies. 4 countries. I ship production systems that scale.",
    cta_primary_text: "View My Work",
    cta_secondary_text: "Download Resume",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    // TODO: Save to Supabase + trigger revalidation
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Edit Hero Section</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update the hero section displayed on the homepage.
      </p>

      <div className="mt-8 space-y-5">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            {value.length > 80 ? (
              <textarea
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={3}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm focus:border-accent focus:outline-none",
                )}
              />
            ) : (
              <input
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm focus:border-accent focus:outline-none",
                )}
              />
            )}
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5",
            "text-sm font-medium text-accent-foreground transition-opacity",
            "hover:opacity-90 disabled:opacity-50",
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save & Publish"}
        </button>
      </div>
    </>
  );
}
