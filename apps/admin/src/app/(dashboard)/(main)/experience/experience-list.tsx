"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Loader2, X } from "lucide-react";
import { MonthYearPicker } from "@portfolio/ui/date-picker";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { saveExperience, deleteExperience } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import {
  CONTRACT_TYPE_LABELS,
  experienceSchema,
  getContractTypeLabel,
  type ContractType,
  type Experience,
  type ExperienceFormData,
} from "@portfolio/shared/schemas";

type ExperienceListProps = {
  initialData: Experience[];
};

const EMPTY: ExperienceFormData = {
  company: "",
  role: "",
  location: "",
  location_type: "remote",
  contract_type: "full_time",
  start_date: "",
  end_date: null,
  description: "",
  tech_tags: [],
  logo_url: null,
  company_url: null,
  sort_order: 0,
};

function experienceRowToForm(row: Experience): ExperienceFormData & { id: string } {
  const { id, created_at: _created_at, updated_at: _updated_at, ...rest } = row;
  return { ...experienceSchema.parse(rest), id };
}

export function ExperienceList({ initialData }: ExperienceListProps) {
  const toast = useToast();
  const [items, setItems] = useState(initialData);
  const [editing, setEditing] = useState<(ExperienceFormData & { id?: string }) | null>(
    null,
  );
  /** Raw text so commas/spaces while typing are preserved; parsed on save only. */
  const [techTagsInput, setTechTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  function beginEdit(entry: ExperienceFormData & { id?: string }) {
    setEditing(entry);
    setTechTagsInput(entry.tech_tags.join(", "));
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    const { id, ...values } = editing;
    const tech_tags = techTagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await runServerAction(
      () => saveExperience(id ?? null, { ...values, tech_tags }),
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
    if (!confirm("Delete this experience entry?")) return;
    const result = await runServerAction(() => deleteExperience(id), toast, {
      successMessage: "Deleted",
      onSuccess: () => setItems((prev) => prev.filter((e) => e.id !== id)),
    });
    if (!result.success) return;
  }

  if (editing) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing.id ? "Edit" : "Add"} Experience
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setTechTagsInput("");
            }}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {(["company", "role", "location"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <input
              value={editing[key] ?? ""}
              onChange={(e) => setEditing((p) => p && { ...p, [key]: e.target.value })}
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Start date</label>
          <MonthYearPicker
            value={editing.start_date}
            onChange={(v) => setEditing((p) => p && { ...p, start_date: v ?? "" })}
            placeholder="Select start month"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">End date</label>
          <MonthYearPicker
            value={editing.end_date}
            onChange={(v) => setEditing((p) => p && { ...p, end_date: v })}
            placeholder="Present (no end date)"
            clearable
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location type</label>
          <Select
            variant="muted"
            className="w-full px-4"
            value={editing.location_type}
            onChange={(e) =>
              setEditing(
                (p) =>
                  p && {
                    ...p,
                    location_type: e.target.value as ExperienceFormData["location_type"],
                  },
              )
            }
          >
            <option value="remote">Remote</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Job type</label>
          <p className="text-muted-foreground mb-1.5 text-xs">
            Contract / full-time / part-time, etc.
          </p>
          <Select
            variant="muted"
            className="w-full px-4"
            value={editing.contract_type}
            onChange={(e) =>
              setEditing(
                (p) => p && { ...p, contract_type: e.target.value as ContractType },
              )
            }
          >
            {(Object.entries(CONTRACT_TYPE_LABELS) as [ContractType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Description (one bullet per line)
          </label>
          <textarea
            value={editing.description}
            onChange={(e) =>
              setEditing((p) => p && { ...p, description: e.target.value })
            }
            rows={5}
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tech tags</label>
          <p className="text-muted-foreground mb-1.5 text-xs">
            Separate with commas (e.g. React, TypeScript, AWS). You can type freely;
            values are split when you save.
          </p>
          <input
            value={techTagsInput}
            onChange={(e) => setTechTagsInput(e.target.value)}
            placeholder="React, TypeScript, Node.js"
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            autoComplete="off"
          />
        </div>
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
          type="button"
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
        type="button"
        onClick={() => beginEdit({ ...EMPTY, sort_order: items.length })}
        className="bg-accent text-accent-foreground mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
      <div className="space-y-2">
        {items.map((exp) => (
          <div
            key={exp.id}
            className={cn(
              "border-border/50 bg-muted/20 hover:border-accent/20 flex items-center gap-3 rounded-lg border p-4 transition-colors",
            )}
          >
            <div className="flex-1">
              <p className="font-medium">{exp.role}</p>
              <p className="text-muted-foreground text-sm">
                {exp.company} &middot; {getContractTypeLabel(exp.contract_type)} &middot;{" "}
                {exp.start_date} – {exp.end_date ?? "Present"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => beginEdit(experienceRowToForm(exp))}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(exp.id)}
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
