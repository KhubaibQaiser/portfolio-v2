"use client";

import { useState } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveSiteConfig } from "@/lib/actions";
import type { Database } from "@portfolio/shared/supabase/database.types";
import type { SocialLink, NavLink } from "@portfolio/shared/schemas";

type SiteConfig = Database["public"]["Tables"]["site_config"]["Row"];

type SocialLinkDraft = SocialLink & { _clientId: string };

function withClientIds(links: SocialLink[]): SocialLinkDraft[] {
  return links.map((l) => ({ ...l, _clientId: crypto.randomUUID() }));
}

function newEmptySocialLink(): SocialLinkDraft {
  return {
    _clientId: crypto.randomUUID(),
    platform: "",
    url: "https://example.com",
    label: "",
  };
}

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
    social_links: withClientIds(socialLinks),
    nav_links: (initialData?.nav_links ?? []) as unknown as NavLink[],
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSocialChange(
    clientId: string,
    field: keyof SocialLink,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.map((s) =>
        s._clientId === clientId ? { ...s, [field]: value } : s,
      ),
    }));
  }

  function addSocialLink() {
    setForm((prev) => ({
      ...prev,
      social_links: [...prev.social_links, newEmptySocialLink()],
    }));
  }

  function removeSocialLink(clientId: string) {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((s) => s._clientId !== clientId),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveSiteConfig({
      ...form,
      social_links: form.social_links.map(({ _clientId: _c, ...rest }) => rest),
    });
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

      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Social Links
          </h3>
          <button
            type="button"
            onClick={addSocialLink}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5",
              "text-sm font-medium text-foreground transition-colors hover:bg-muted/50",
            )}
          >
            <Plus className="h-4 w-4" />
            Add link
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Use platform keys like <code className="rounded bg-muted px-1">github</code>,{" "}
          <code className="rounded bg-muted px-1">linkedin</code>, or{" "}
          <code className="rounded bg-muted px-1">phone</code>. For phone, set URL to{" "}
          <code className="rounded bg-muted px-1">tel:+923001234567</code> and label to the
          display number.
        </p>

        <div className="mt-3 space-y-3">
          {form.social_links.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
              No social links yet. Click &quot;Add link&quot; to add one.
            </p>
          ) : (
            form.social_links.map((link) => (
              <div
                key={link._clientId}
                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-end"
              >
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Platform
                    </label>
                    <input
                      value={link.platform}
                      onChange={(e) =>
                        handleSocialChange(link._clientId, "platform", e.target.value)
                      }
                      placeholder="e.g. github, phone"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      URL
                    </label>
                    <input
                      value={link.url}
                      onChange={(e) =>
                        handleSocialChange(link._clientId, "url", e.target.value)
                      }
                      placeholder="https://… or tel:+…"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Label
                    </label>
                    <input
                      value={link.label}
                      onChange={(e) =>
                        handleSocialChange(link._clientId, "label", e.target.value)
                      }
                      placeholder="Shown in header / PDF"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSocialLink(link._clientId)}
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-md border border-border p-2",
                    "text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
                  )}
                  aria-label="Remove link"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {message && (
        <p className={cn("text-sm", message === "Saved!" ? "text-green-600" : "text-red-500")}>
          {message}
        </p>
      )}

      <button
        type="button"
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
