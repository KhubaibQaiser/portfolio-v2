"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveTestimonial, deleteTestimonialAction } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type { Testimonial } from "@portfolio/shared/schemas";

type TestimonialsListProps = {
  initialData: Testimonial[];
};

const EMPTY: Omit<Testimonial, "id" | "created_at" | "updated_at"> = {
  quote: "",
  author_name: "",
  author_title: "",
  company: "",
  avatar_url: null,
  sort_order: 0,
};

export function TestimonialsList({ initialData }: TestimonialsListProps) {
  const toast = useToast();
  const [items, setItems] = useState(initialData);
  const [editing, setEditing] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    const { id, ...values } = editing;
    const result = await runServerAction(
      () => saveTestimonial(id ?? null, values),
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
    if (!confirm("Delete this testimonial?")) return;
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
            {editing.id ? "Edit" : "Add"} Testimonial
          </h2>
          <button
            onClick={() => setEditing(null)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Quote</label>
          <textarea
            value={editing.quote}
            onChange={(e) => setEditing((p) => p && { ...p, quote: e.target.value })}
            rows={4}
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        {(["author_name", "author_title", "company"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <input
              value={editing[key]}
              onChange={(e) => setEditing((p) => p && { ...p, [key]: e.target.value })}
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Sort Order</label>
          <input
            type="number"
            value={editing.sort_order}
            onChange={(e) =>
              setEditing((p) => p && { ...p, sort_order: parseInt(e.target.value) || 0 })
            }
            className="border-border bg-muted/30 focus:border-accent w-32 rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
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
        onClick={() => setEditing({ ...EMPTY, sort_order: items.length })}
        className="bg-accent text-accent-foreground mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus className="h-4 w-4" /> Add Testimonial
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
                &ldquo;{t.quote.slice(0, 80)}...&rdquo;
              </p>
              <p className="mt-1 text-sm font-medium">
                {t.author_name}, {t.company}
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
