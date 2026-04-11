"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveExperience, deleteExperience } from "@/lib/actions";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Experience = Database["public"]["Tables"]["experience"]["Row"];

type ExperienceListProps = {
  initialData: Experience[];
};

const EMPTY: Omit<Experience, "id" | "created_at" | "updated_at"> = {
  company: "",
  role: "",
  location: "",
  location_type: "remote",
  start_date: "",
  end_date: null,
  description: "",
  tech_tags: [],
  logo_url: null,
  company_url: null,
  sort_order: 0,
};

export function ExperienceList({ initialData }: ExperienceListProps) {
  const [items, setItems] = useState(initialData);
  const [editing, setEditing] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    const { id, ...values } = editing;
    const result = await saveExperience(id ?? null, values);
    setSaving(false);
    if (result.success) {
      setMessage("Saved!");
      setEditing(null);
      if (typeof window !== "undefined") window.location.reload();
    } else {
      setMessage(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this experience entry?")) return;
    const result = await deleteExperience(id);
    if (result.success) {
      setItems((prev) => prev.filter((e) => e.id !== id));
    }
  }

  if (editing) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing.id ? "Edit" : "Add"} Experience</h2>
          <button onClick={() => setEditing(null)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {(["company", "role", "location", "start_date", "end_date"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">{key.replace(/_/g, " ")}</label>
            <input
              value={editing[key] ?? ""}
              onChange={(e) => setEditing((p) => p && { ...p, [key]: e.target.value || null })}
              className="w-full rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Location Type</label>
          <select
            value={editing.location_type}
            onChange={(e) => setEditing((p) => p && { ...p, location_type: e.target.value as "remote" | "onsite" | "hybrid" })}
            className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="remote">Remote</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description (one bullet per line)</label>
          <textarea
            value={editing.description}
            onChange={(e) => setEditing((p) => p && { ...p, description: e.target.value })}
            rows={5}
            className="w-full rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tech Tags (comma-separated)</label>
          <input
            value={editing.tech_tags.join(", ")}
            onChange={(e) => setEditing((p) => p && { ...p, tech_tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="w-full rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Sort Order</label>
          <input
            type="number"
            value={editing.sort_order}
            onChange={(e) => setEditing((p) => p && { ...p, sort_order: parseInt(e.target.value) || 0 })}
            className="w-32 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        {message && <p className={cn("text-sm", message === "Saved!" ? "text-green-600" : "text-red-500")}>{message}</p>}

        <button onClick={handleSave} disabled={saving} className={cn("flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50")}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save & Publish"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setEditing({ ...EMPTY, sort_order: items.length })}
        className="mb-4 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
      <div className="space-y-2">
        {items.map((exp) => (
          <div key={exp.id} className={cn("flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-4 transition-colors hover:border-accent/20")}>
            <div className="flex-1">
              <p className="font-medium">{exp.role}</p>
              <p className="text-sm text-muted-foreground">{exp.company} &middot; {exp.start_date} – {exp.end_date ?? "Present"}</p>
            </div>
            <button onClick={() => setEditing(exp)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(exp.id)} className="rounded-md p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
