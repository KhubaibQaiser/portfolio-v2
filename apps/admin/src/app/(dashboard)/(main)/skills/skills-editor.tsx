"use client";

import { useState } from "react";
import { Select } from "@portfolio/ui/select";
import { Plus, Save, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveSkills, deleteSkill } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import type { Skill, SkillCategory } from "@portfolio/shared/schemas";

type SkillsEditorProps = {
  initialData: Skill[];
};

export function SkillsEditor({ initialData }: SkillsEditorProps) {
  const toast = useToast();
  const [skills, setSkills] = useState(initialData);
  const [saving, setSaving] = useState(false);

  function addSkill() {
    setSkills((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        category: "frontend",
        proficiency: 50,
        icon: null,
        years: 1,
        sort_order: prev.length,
        created_at: "",
        updated_at: "",
      },
    ]);
  }

  function updateSkill(id: string, field: keyof Skill, value: string | number) {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function removeSkill(id: string) {
    if (id.startsWith("new-")) {
      setSkills((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    await runServerAction(() => deleteSkill(id), toast, {
      successMessage: "Deleted",
      onSuccess: () => setSkills((prev) => prev.filter((s) => s.id !== id)),
    });
  }

  async function handleSave() {
    setSaving(true);
    const payload = skills.map((s) => ({
      id: s.id.startsWith("new-") ? undefined : s.id,
      name: s.name,
      category: s.category as SkillCategory,
      proficiency: s.proficiency,
      icon: s.icon,
      years: s.years,
      sort_order: s.sort_order,
    }));
    const result = await runServerAction(() => saveSkills(payload), toast, {
      onSuccess: () => window.location.reload(),
    });
    setSaving(false);
    if (!result.success) return;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={addSkill}
          className="bg-accent text-accent-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Skill
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="border-border/50 bg-muted/20 grid grid-cols-[1fr_120px_80px_60px_40px] items-center gap-3 rounded-lg border p-3"
          >
            <input
              value={skill.name}
              onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
              placeholder="Skill name"
              className="border-border bg-background focus:border-accent rounded-md border px-3 py-1.5 text-sm focus:outline-hidden"
            />
            <Select
              className="bg-background h-9 min-w-0 rounded-md px-2 py-1.5 text-sm"
              value={skill.category}
              onChange={(e) => updateSkill(skill.id, "category", e.target.value)}
            >
              {Object.entries(SKILL_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={skill.proficiency}
                onChange={(e) =>
                  updateSkill(skill.id, "proficiency", parseInt(e.target.value) || 0)
                }
                className="border-border bg-background focus:border-accent w-full rounded-md border px-2 py-1.5 text-center text-sm focus:outline-hidden"
              />
              <span className="text-muted-foreground text-xs">%</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={30}
                value={skill.years}
                onChange={(e) =>
                  updateSkill(skill.id, "years", parseInt(e.target.value) || 0)
                }
                className="border-border bg-background focus:border-accent w-full rounded-md border px-2 py-1.5 text-center text-sm focus:outline-hidden"
              />
              <span className="text-muted-foreground text-xs">yr</span>
            </div>
            <button
              onClick={() => removeSkill(skill.id)}
              className="text-muted-foreground rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "bg-accent text-accent-foreground mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50",
        )}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "Saving..." : "Save All & Publish"}
      </button>
    </div>
  );
}
