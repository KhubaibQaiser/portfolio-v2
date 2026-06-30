"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveTestimonial, deleteTestimonialAction } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import {
  DEFAULT_LINKEDIN_RECOMMENDATIONS_URL,
  type Testimonial,
} from "@portfolio/shared/schemas";

type RecommendationsListProps = {
  initialData: Testimonial[];
};

const EMPTY: Omit<Testimonial, "id" | "created_at" | "updated_at"> = {
  full_name: "",
  profile_url: "",
  role_title: "",
  recommended_at: "",
  description: "",
  linkedin_url: DEFAULT_LINKEDIN_RECOMMENDATIONS_URL,
  avatar_url: null,
};

const FORM_FIELDS = [
  { key: "full_name" as const, label: "Full name", type: "text" },
  { key: "profile_url" as const, label: "Profile URL", type: "text" },
  { key: "role_title" as const, label: "Role / title", type: "text" },
  {
    key: "recommended_at" as const,
    label: "Date (DD-MM-YYYY)",
    type: "text",
    placeholder: "15-03-2024",
  },
  { key: "linkedin_url" as const, label: "LinkedIn verify URL", type: "text" },
  {
    key: "avatar_url" as const,
    label: "Avatar URL",
    type: "text",
    optional: true,
  },
];

export function RecommendationsList({ initialData }: RecommendationsListProps) {
  const toast = useToast();
  const [items, setItems] = useState(initialData);
  const [editing, setEditing] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    const { id, ...values } = editing;
    const payload = {
      ...values,
      avatar_url: values.avatar_url?.trim() ? values.avatar_url.trim() : null,
    };
    const result = await runServerAction(
      () => saveTestimonial(id ?? null, payload),
      toast,
      {
        onSuccess: () => {
          setEditing(null);
          window.location.reload();
        },
      },
    );
    setSaving(false);
    if (!result.success) return;
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recommendation?")) return;
    await runServerAction(() => deleteTestimonialAction(id), toast, {
      successMessage: "Deleted",
      onSuccess: () => setItems((prev) => prev.filter((t) => t.id !== id)),
    });
  }

  if (editing) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing.id ? "Edit" : "Add"} Recommendation
          </h2>
          <button
            onClick={() => setEditing(null)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={editing.description}
            onChange={(e) =>
              setEditing((p) => p && { ...p, description: e.target.value })
            }
            rows={6}
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        {FORM_FIELDS.map(({ key, label, type, placeholder, optional }) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">
              {label}
              {optional ? " (optional)" : null}
            </label>
            <input
              type={type}
              value={editing[key] ?? ""}
              placeholder={placeholder}
              onChange={(e) =>
                setEditing((p) =>
                  p
                    ? {
                        ...p,
                        [key]: optional ? e.target.value || null : e.target.value,
                      }
                    : p,
                )
              }
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "bg-accent text-accent-foreground flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50",
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

  return (
    <div className="mt-6">
      <button
        onClick={() => setEditing({ ...EMPTY })}
        className="bg-accent text-accent-foreground mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus className="h-4 w-4" /> Add Recommendation
      </button>
      <div className="space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "border-border/50 bg-muted/20 hover:border-accent/20 flex items-center gap-3 rounded-lg border p-4 transition-colors",
            )}
          >
            <div className="flex-1">
              <p className="text-muted-foreground text-sm italic">
                &ldquo;{t.description.slice(0, 80)}
                {t.description.length > 80 ? "..." : ""}&rdquo;
              </p>
              <p className="mt-1 text-sm font-medium">
                {t.full_name}
                {t.recommended_at ? ` · ${t.recommended_at}` : null}
              </p>
            </div>
            <button
              onClick={() => setEditing(t)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="text-muted-foreground rounded-md p-2 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
