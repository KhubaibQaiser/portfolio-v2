"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { saveAbout } from "@/lib/actions";
import type { AboutFormData } from "@portfolio/shared/schemas";
import type { Database } from "@portfolio/shared/supabase/database.types";

type About = Database["public"]["Tables"]["about"]["Row"];

type AboutFormProps = {
  initialData: About | null;
  /** Unique company names in Experience — used for the public “Companies” stat. */
  derivedCompaniesCount: number;
};

export function AboutForm({ initialData, derivedCompaniesCount }: AboutFormProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<AboutFormData>({
    bio: initialData?.bio ?? "",
    photo_url: initialData?.photo_url ?? "",
    status: (initialData?.status as AboutFormData["status"] | undefined) ?? "available",
    timezone: initialData?.timezone ?? "GMT+5",
    years_experience: initialData?.years_experience ?? 0,
    companies_count: derivedCompaniesCount,
    countries_count: initialData?.countries_count ?? 0,
    projects_count: initialData?.projects_count ?? 0,
    users_impacted: initialData?.users_impacted ?? "0",
    industries: initialData?.industries ?? [],
    languages: initialData?.languages ?? [],
  });

  function handleChange<K extends keyof AboutFormData>(field: K, value: AboutFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveAbout({ ...form, companies_count: derivedCompaniesCount });
    setSaving(false);
    setMessage(result.success ? "Saved!" : result.error);
  }

  return (
    <div className="mt-8 space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          rows={6}
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Photo URL</label>
        <input
          value={form.photo_url}
          onChange={(e) => handleChange("photo_url", e.target.value)}
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Status</label>
        <Select
          variant="muted"
          className="px-4"
          value={form.status}
          onChange={(e) =>
            handleChange("status", e.target.value as AboutFormData["status"])
          }
        >
          <option value="available">Open to Opportunities</option>
          <option value="open">Open to Conversations</option>
          <option value="unavailable">Not Available</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Companies</label>
          <div
            className={cn(
              "flex min-h-[42px] items-center rounded-lg border border-border bg-muted/20 px-4 py-2.5",
              "text-sm text-muted-foreground",
            )}
          >
            {derivedCompaniesCount}{" "}
            <span className="ml-1.5 text-xs">
              (unique employers from Experience — updates when you edit that list)
            </span>
          </div>
        </div>
        {(
          [
            ["years_experience", "Years Experience"],
            ["countries_count", "Countries"],
            ["projects_count", "Projects"],
            ["users_impacted", "Users Impacted"],
            ["timezone", "Timezone"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium">{label}</label>
            <input
              value={form[key]}
              onChange={(e) => {
                const v = key === "users_impacted" || key === "timezone"
                  ? e.target.value
                  : parseInt(e.target.value) || 0;
                handleChange(key, v);
              }}
              className={cn(
                "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                "text-sm focus:border-accent focus:outline-hidden",
              )}
            />
            {key === "countries_count" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Manual count for how many countries you’ve worked across (there is no per-job country
                field yet). Used with Companies in the “Companies across N countries” line on the
                site.
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Industries (comma-separated)</label>
        <input
          value={form.industries.join(", ")}
          onChange={(e) =>
            handleChange("industries", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
          }
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Languages (comma-separated)</label>
        <input
          value={form.languages.join(", ")}
          onChange={(e) =>
            handleChange("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
          }
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-hidden",
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
