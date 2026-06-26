"use client";

import { useState } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { saveAbout } from "@/lib/actions";
import type { About, AboutFormData, Highlight } from "@portfolio/shared/schemas";

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
    countries_count: initialData?.countries_count ?? 0,
    projects_count: initialData?.projects_count ?? 0,
    users_impacted: initialData?.users_impacted ?? "0",
    industries: initialData?.industries ?? [],
    languages: initialData?.languages ?? [],
    highlights: initialData?.highlights ?? [],
  });

  function handleChange<K extends keyof AboutFormData>(
    field: K,
    value: AboutFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleHighlightChange(index: number, field: keyof Highlight, value: string) {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h, i) =>
        i === index ? { ...h, [field]: value } : h,
      ),
    }));
  }

  function addHighlight() {
    setForm((prev) => ({
      ...prev,
      highlights: [...prev.highlights, { title: "", description: "" }],
    }));
  }

  function removeHighlight(index: number) {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveAbout(form);
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
            "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
            "focus:border-accent text-sm focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Photo URL</label>
        <input
          value={form.photo_url}
          onChange={(e) => handleChange("photo_url", e.target.value)}
          className={cn(
            "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
            "focus:border-accent text-sm focus:outline-hidden",
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
              "border-border bg-muted/20 flex min-h-[42px] items-center rounded-lg border px-4 py-2.5",
              "text-muted-foreground text-sm",
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
                const v =
                  key === "users_impacted" || key === "timezone"
                    ? e.target.value
                    : parseInt(e.target.value) || 0;
                handleChange(key, v);
              }}
              className={cn(
                "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                "focus:border-accent text-sm focus:outline-hidden",
              )}
            />
            {key === "countries_count" && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                Manual count for how many countries you’ve worked across (there is no
                per-job country field yet). Used with Companies in the “Companies across N
                countries” line on the site.
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Industries (comma-separated)
        </label>
        <input
          value={form.industries.join(", ")}
          onChange={(e) =>
            handleChange(
              "industries",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          className={cn(
            "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
            "focus:border-accent text-sm focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Languages (comma-separated)
        </label>
        <input
          value={form.languages.join(", ")}
          onChange={(e) =>
            handleChange(
              "languages",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          className={cn(
            "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
            "focus:border-accent text-sm focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-accent text-sm font-semibold tracking-wider uppercase">
            Why Hire Me
          </h3>
          <button
            type="button"
            onClick={addHighlight}
            className={cn(
              "border-border bg-muted/30 flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5",
              "text-foreground hover:bg-muted/50 text-sm font-medium transition-colors",
            )}
          >
            <Plus className="h-4 w-4" />
            Add highlight
          </button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Differentiator cards shown in the “Why Hire Me” section on the home page.
        </p>

        <div className="mt-3 space-y-3">
          {form.highlights.length === 0 ? (
            <p className="border-border/80 bg-muted/10 text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
              No highlights yet. Click &quot;Add highlight&quot; to add one.
            </p>
          ) : (
            form.highlights.map((highlight, index) => (
              <div
                key={index}
                className="border-border/50 bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
              >
                <div className="grid flex-1 gap-3">
                  <input
                    value={highlight.title}
                    onChange={(e) =>
                      handleHighlightChange(index, "title", e.target.value)
                    }
                    placeholder="Title (e.g. I Ship End-to-End)"
                    className="border-border bg-background focus:border-accent w-full rounded-md border px-3 py-2 text-sm focus:outline-hidden"
                  />
                  <textarea
                    value={highlight.description}
                    onChange={(e) =>
                      handleHighlightChange(index, "description", e.target.value)
                    }
                    rows={2}
                    placeholder="One or two sentences."
                    className="border-border bg-background focus:border-accent w-full rounded-md border px-3 py-2 text-sm focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeHighlight(index)}
                  className={cn(
                    "border-border flex shrink-0 items-center justify-center rounded-md border p-2",
                    "text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors",
                  )}
                  aria-label="Remove highlight"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {message && (
        <p
          className={cn(
            "text-sm",
            message === "Saved!" ? "text-green-600" : "text-red-500",
          )}
        >
          {message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "bg-accent flex items-center gap-2 rounded-lg px-5 py-2.5",
          "text-accent-foreground text-sm font-medium transition-opacity",
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
  );
}
