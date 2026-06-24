"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Loader2, X, Star } from "lucide-react";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { saveProject, deleteProject } from "@/lib/actions";
import {
  projectSchema,
  type Project,
  type ProjectFormData,
} from "@portfolio/shared/schemas";

type ProjectsListProps = {
  initialData: Project[];
};

const EMPTY: ProjectFormData = {
  title: "",
  slug: "",
  description: "",
  summary: "",
  cover_url: null,
  tech_tags: [],
  role: "",
  type: "web",
  github_url: null,
  live_url: null,
  playstore_url: null,
  appstore_url: null,
  is_featured: false,
  sort_order: 0,
};

function projectRowToForm(row: Project): ProjectFormData & { id: string } {
  const { id, created_at: _created_at, updated_at: _updated_at, ...rest } = row;
  return { ...projectSchema.parse(rest), id };
}

export function ProjectsList({ initialData }: ProjectsListProps) {
  const [items, setItems] = useState(initialData);
  const [editing, setEditing] = useState<(ProjectFormData & { id?: string }) | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    const { id, ...values } = editing;
    const result = await saveProject(id ?? null, values);
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
    if (!confirm("Delete this project?")) return;
    const result = await deleteProject(id);
    if (result.success) setItems((prev) => prev.filter((p) => p.id !== id));
  }

  if (editing) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing.id ? "Edit" : "Add"} Project</h2>
          <button
            onClick={() => setEditing(null)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {(["title", "slug", "summary", "role"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">{key}</label>
            <input
              value={editing[key]}
              onChange={(e) => setEditing((p) => p && { ...p, [key]: e.target.value })}
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={editing.description}
            onChange={(e) =>
              setEditing((p) => p && { ...p, description: e.target.value })
            }
            rows={4}
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <Select
            variant="muted"
            className="px-4"
            value={editing.type}
            onChange={(e) =>
              setEditing(
                (p) => p && { ...p, type: e.target.value as ProjectFormData["type"] },
              )
            }
          >
            {["web", "mobile", "game", "open-source", "other"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tech Tags (comma-separated)
          </label>
          <input
            value={editing.tech_tags.join(", ")}
            onChange={(e) =>
              setEditing(
                (p) =>
                  p && {
                    ...p,
                    tech_tags: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
              )
            }
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        {(["github_url", "live_url", "cover_url"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <input
              value={editing[key] ?? ""}
              onChange={(e) =>
                setEditing((p) => p && { ...p, [key]: e.target.value || null })
              }
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={editing.is_featured}
              onChange={(e) =>
                setEditing((p) => p && { ...p, is_featured: e.target.checked })
              }
            />
            Featured
          </label>
          <div>
            <label className="text-sm font-medium">Sort Order: </label>
            <input
              type="number"
              value={editing.sort_order}
              onChange={(e) =>
                setEditing(
                  (p) => p && { ...p, sort_order: parseInt(e.target.value) || 0 },
                )
              }
              className="border-border bg-muted/30 w-20 rounded border px-2 py-1 text-sm"
            />
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
        <Plus className="h-4 w-4" /> Add Project
      </button>
      <div className="space-y-2">
        {items.map((project) => (
          <div
            key={project.id}
            className={cn(
              "border-border/50 bg-muted/20 hover:border-accent/20 flex items-center gap-3 rounded-lg border p-4 transition-colors",
            )}
          >
            <Star
              className={cn(
                "h-4 w-4",
                project.is_featured
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground/30",
              )}
            />
            <div className="flex-1">
              <p className="font-medium">{project.title}</p>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {project.type}
              </span>
            </div>
            <button
              onClick={() => setEditing(projectRowToForm(project))}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(project.id)}
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
