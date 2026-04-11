"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AboutEditPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bio: "I'm a Senior Software Engineer with over a decade of experience building high-performance web and mobile applications across Ad-Tech, E-Commerce, SaaS, and EdTech industries.",
    status: "available",
    timezone: "GMT+5 / 8h overlap with US EST",
    years_experience: "11",
    companies_count: "6",
    countries_count: "4",
    projects_count: "30",
    users_impacted: "500K+",
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
      <h1 className="text-2xl font-bold tracking-tight">Edit About Section</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your bio, stats, and availability status.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={6}
            className={cn(
              "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
              "text-sm focus:border-accent focus:outline-none",
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Status</label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          >
            <option value="available">Open to Opportunities</option>
            <option value="open">Open to Conversations</option>
            <option value="unavailable">Not Available</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ["years_experience", "Years Experience"],
            ["companies_count", "Companies"],
            ["countries_count", "Countries"],
            ["projects_count", "Projects"],
            ["users_impacted", "Users Impacted"],
            ["timezone", "Timezone"],
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
