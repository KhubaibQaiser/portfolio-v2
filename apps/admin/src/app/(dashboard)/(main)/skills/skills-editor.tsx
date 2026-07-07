"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus } from "lucide-react";
import { Form, FormSaveButton } from "@/components/form";
import { saveSkills } from "@/lib/actions";
import {
  getCategoryDisplayOrder,
  insertNewSkill,
  moveSkillToCategory,
  normalizeSkillsOrder,
  removeSkillAndReindex,
  reorderSkillInCategory,
} from "@/lib/skill-sort-utils";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type { Skill, SkillCategory } from "@portfolio/shared/schemas";
import { SkillsCategorySection } from "./skills-category-section";
import { SkillsColumnHeader, SortableSkillRow } from "./sortable-skill-row";

type SkillsEditorProps = {
  initialData: Skill[];
};

type SkillsFormValues = {
  skills: Skill[];
};

export function SkillsEditor({ initialData }: SkillsEditorProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const normalizedInitial = useMemo(
    () => normalizeSkillsOrder(initialData),
    [initialData],
  );

  const form = useForm<SkillsFormValues>({
    defaultValues: { skills: normalizedInitial },
  });

  const { control, register, handleSubmit, reset, setValue } = form;
  const { replace } = useFieldArray({
    control,
    name: "skills",
    keyName: "fieldKey",
  });

  const skills = useWatch({ control, name: "skills" }) ?? normalizedInitial;

  const categoryOrder = useMemo(
    () => getCategoryDisplayOrder(skills.map((s) => s.category)),
    [skills],
  );

  const skillsByCategory = useMemo(() => {
    const map = new Map<SkillCategory, Skill[]>();
    for (const skill of skills) {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    }
    for (const [category, list] of map) {
      map.set(
        category,
        [...list].sort((a, b) => a.sort_order - b.sort_order),
      );
    }
    return map;
  }, [skills]);

  function applySkills(next: Skill[]) {
    replace(next);
    setValue("skills", next, { shouldDirty: true });
  }

  function handleReorder(category: SkillCategory, activeId: string, overId: string) {
    applySkills(reorderSkillInCategory(skills, category, activeId, overId));
  }

  function handleCategoryChange(skillId: string, newCategory: SkillCategory) {
    applySkills(moveSkillToCategory(skills, skillId, newCategory));
  }

  function handleRemove(skillId: string) {
    applySkills(removeSkillAndReindex(skills, skillId));
  }

  function handleAdd() {
    const draft: Skill = {
      id: `new-${Date.now()}`,
      name: "",
      category: "frontend",
      proficiency: 50,
      icon: null,
      years: 1,
      sort_order: 0,
      created_at: "",
      updated_at: "",
    };
    applySkills(insertNewSkill(skills, draft));
  }

  async function onSubmit(values: SkillsFormValues) {
    setSaving(true);
    const ordered = normalizeSkillsOrder(values.skills);
    const initialIds = new Set(initialData.map((skill) => skill.id));
    const currentIds = new Set(
      ordered.map((skill) => skill.id).filter((id) => !id.startsWith("new-")),
    );
    const deletedIds = [...initialIds].filter((id) => !currentIds.has(id));

    const payload = ordered.map((skill) => ({
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
    if (result.success) reset({ skills: ordered });
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleAdd}
            className="bg-accent text-accent-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Skill
          </button>
        </div>

        <div className="mt-4 space-y-6">
          <SkillsColumnHeader />

          {categoryOrder.map((category) => {
            const categorySkills = skillsByCategory.get(category);
            if (!categorySkills?.length) return null;

            return (
              <SkillsCategorySection
                key={category}
                category={category}
                skillIds={categorySkills.map((s) => s.id)}
                onReorder={handleReorder}
              >
                {categorySkills.map((skill) => {
                  const index = skills.findIndex((s) => s.id === skill.id);
                  if (index < 0) return null;

                  return (
                    <SortableSkillRow
                      key={skill.id}
                      id={skill.id}
                      index={index}
                      register={register}
                      control={control}
                      onCategoryChange={handleCategoryChange}
                      onRemove={handleRemove}
                    />
                  );
                })}
              </SkillsCategorySection>
            );
          })}
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
