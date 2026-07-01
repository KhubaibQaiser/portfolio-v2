"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Select } from "@portfolio/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Form, FormSaveButton } from "@/components/form";
import { saveSkills } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import type { Skill, SkillCategory } from "@portfolio/shared/schemas";

type SkillsEditorProps = {
  initialData: Skill[];
};

type SkillsFormValues = {
  skills: Skill[];
};

export function SkillsEditor({ initialData }: SkillsEditorProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<SkillsFormValues>({
    defaultValues: { skills: initialData },
  });

  const { control, register, handleSubmit, reset } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "skills",
    keyName: "fieldKey",
  });

  async function onSubmit(values: SkillsFormValues) {
    setSaving(true);
    const initialIds = new Set(initialData.map((skill) => skill.id));
    const currentIds = new Set(
      values.skills.map((skill) => skill.id).filter((id) => !id.startsWith("new-")),
    );
    const deletedIds = [...initialIds].filter((id) => !currentIds.has(id));

    const payload = values.skills.map((skill) => ({
      id: skill.id.startsWith("new-") ? undefined : skill.id,
      name: skill.name,
      category: skill.category as SkillCategory,
      proficiency: skill.proficiency,
      icon: skill.icon,
      years: skill.years,
      sort_order: skill.sort_order,
    }));

    const result = await runServerAction(() => saveSkills(payload, deletedIds), toast, {
      onSuccess: () => window.location.reload(),
    });
    setSaving(false);
    if (result.success) reset(values);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              append({
                id: `new-${Date.now()}`,
                name: "",
                category: "frontend",
                proficiency: 50,
                icon: null,
                years: 1,
                sort_order: fields.length,
                created_at: "",
                updated_at: "",
              })
            }
            className="bg-accent text-accent-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Skill
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.fieldKey}
              className="border-border/50 bg-muted/20 grid grid-cols-[1fr_120px_80px_60px_40px] items-center gap-3 rounded-lg border p-3"
            >
              <input
                {...register(`skills.${index}.name`)}
                placeholder="Skill name"
                className="border-border bg-background focus:border-accent rounded-md border px-3 py-1.5 text-sm focus:outline-hidden"
              />
              <Select
                className="bg-background h-9 min-w-0 rounded-md px-2 py-1.5 text-sm"
                {...register(`skills.${index}.category`)}
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
                  {...register(`skills.${index}.proficiency`, { valueAsNumber: true })}
                  className="border-border bg-background focus:border-accent w-full rounded-md border px-2 py-1.5 text-center text-sm focus:outline-hidden"
                />
                <span className="text-muted-foreground text-xs">%</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={30}
                  {...register(`skills.${index}.years`, { valueAsNumber: true })}
                  className="border-border bg-background focus:border-accent w-full rounded-md border px-2 py-1.5 text-center text-sm focus:outline-hidden"
                />
                <span className="text-muted-foreground text-xs">yr</span>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-muted-foreground rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <input type="hidden" {...register(`skills.${index}.id`)} />
              <input
                type="hidden"
                {...register(`skills.${index}.sort_order`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </div>

        <FormSaveButton
          saving={saving}
          onClick={handleSubmit(onSubmit)}
          className="mt-6"
        />
      </form>
    </Form>
  );
}
