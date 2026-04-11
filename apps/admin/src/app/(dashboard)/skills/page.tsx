"use client";

import { useState } from "react";
import { Plus, Save, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";

type SkillEntry = {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  years: number;
};

const initialSkills: SkillEntry[] = [
  { id: "1", name: "React 18", category: "frontend", proficiency: 95, years: 8 },
  { id: "2", name: "Next.js", category: "frontend", proficiency: 92, years: 5 },
  { id: "3", name: "TypeScript", category: "frontend", proficiency: 93, years: 6 },
  { id: "4", name: "Tailwind CSS", category: "frontend", proficiency: 90, years: 4 },
  { id: "5", name: "React Native", category: "mobile", proficiency: 88, years: 5 },
  { id: "6", name: "Node.js", category: "backend", proficiency: 85, years: 7 },
  { id: "7", name: "AWS Lambda", category: "cloud", proficiency: 82, years: 3 },
  { id: "8", name: "AWS CDK", category: "cloud", proficiency: 78, years: 2 },
  { id: "9", name: "Docker", category: "devops", proficiency: 70, years: 3 },
  { id: "10", name: "Jest / RTL", category: "testing", proficiency: 80, years: 5 },
];

export default function SkillsPage() {
  const [skills, setSkills] = useState(initialSkills);
  const [saving, setSaving] = useState(false);

  function addSkill() {
    setSkills((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        category: "frontend",
        proficiency: 50,
        years: 1,
      },
    ]);
  }

  function updateSkill(id: string, field: keyof SkillEntry, value: string | number) {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  function removeSkill(id: string) {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your skill categories and proficiency levels.
          </p>
        </div>
        <button
          onClick={addSkill}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Skill
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="grid grid-cols-[1fr_120px_80px_60px_40px] items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
          >
            <input
              value={skill.name}
              onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
              placeholder="Skill name"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <select
              value={skill.category}
              onChange={(e) => updateSkill(skill.id, "category", e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            >
              {Object.entries(SKILL_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={skill.proficiency}
                onChange={(e) =>
                  updateSkill(skill.id, "proficiency", parseInt(e.target.value) || 0)
                }
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm focus:border-accent focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">%</span>
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
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm focus:border-accent focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">yr</span>
            </div>
            <button
              onClick={() => removeSkill(skill.id)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
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
          "mt-6 flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5",
          "text-sm font-medium text-accent-foreground transition-opacity",
          "hover:opacity-90 disabled:opacity-50",
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save & Publish"}
      </button>
    </>
  );
}
