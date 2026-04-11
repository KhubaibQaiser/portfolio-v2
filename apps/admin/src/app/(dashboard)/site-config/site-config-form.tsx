"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveSiteConfig } from "@/lib/actions";
import type { Database } from "@portfolio/shared/supabase/database.types";
import type { SocialLink, NavLink } from "@portfolio/shared/schemas";

type SiteConfig = Database["public"]["Tables"]["site_config"]["Row"];

type SiteConfigFormProps = {
  initialData: SiteConfig | null;
};

export function SiteConfigForm({ initialData }: SiteConfigFormProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const socialLinks = (initialData?.social_links ?? []) as unknown as SocialLink[];

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    location: initialData?.location ?? "",
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    social_links: socialLinks,
    nav_links: (initialData?.nav_links ?? []) as unknown as NavLink[],
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSocialChange(idx: number, field: keyof SocialLink, value: string) {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveSiteConfig(form);
    setSaving(false);
    setMessage(result.success ? "Saved!" : result.error);
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["name", "Full Name"],
            ["email", "Email"],
            ["location", "Location"],
            ["title", "Job Title"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium">{label}</label>
            <input
              value={form[key]}
              onChange={(e) => handleChange(key, e.target.value)}
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
      <div className="space-y-3">
        {form.social_links.map((link, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-3">
            <input
              value={link.platform}
              onChange={(e) => handleSocialChange(idx, "platform", e.target.value)}
              placeholder="Platform"
              className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <input
              value={link.url}
              onChange={(e) => handleSocialChange(idx, "url", e.target.value)}
              placeholder="URL"
              className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <input
              value={link.label}
              onChange={(e) => handleSocialChange(idx, "label", e.target.value)}
              placeholder="Label"
              className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        ))}
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
