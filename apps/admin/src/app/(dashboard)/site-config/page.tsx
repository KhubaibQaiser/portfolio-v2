"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SiteConfigPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "Khubaib Qaiser",
    email: "khubaib.dev@gmail.com",
    location: "Islamabad, Pakistan",
    title: "Senior Software Engineer",
    description:
      "Senior Software Engineer with 11+ years of experience specializing in React, Next.js, TypeScript, React Native, and cloud infrastructure.",
    github: "https://github.com/khubaibqaiser",
    linkedin: "https://linkedin.com/in/khubaib-qaiser",
    twitter: "https://twitter.com/khubaibqaiser",
    instagram: "https://instagram.com/khubaibqaiser",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Site Configuration</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your personal info, social links, and SEO metadata.
      </p>

      <div className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["name", "Full Name"],
            ["email", "Email"],
            ["location", "Location"],
            ["title", "Job Title"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => handleChange(key!, e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm focus:border-accent focus:outline-none",
                )}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">SEO Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className={cn(
              "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
              "text-sm focus:border-accent focus:outline-none",
            )}
          />
        </div>

        <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-accent">
          Social Links
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["github", "GitHub"],
            ["linkedin", "LinkedIn"],
            ["twitter", "Twitter / X"],
            ["instagram", "Instagram"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => handleChange(key!, e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm focus:border-accent focus:outline-none",
                )}
              />
            </div>
          ))}
        </div>

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
    </>
  );
}
