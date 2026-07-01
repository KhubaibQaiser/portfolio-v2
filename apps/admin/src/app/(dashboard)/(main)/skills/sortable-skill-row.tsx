"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Controller, type Control, type UseFormRegister } from "react-hook-form";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import type { Skill, SkillCategory } from "@portfolio/shared/schemas";

export const SKILL_ROW_GRID =
  "grid grid-cols-[28px_1fr_120px_80px_60px_40px] items-center gap-3";

type SkillsFormValues = {
  skills: Skill[];
};

type SortableSkillRowProps = {
  id: string;
  index: number;
  register: UseFormRegister<SkillsFormValues>;
  control: Control<SkillsFormValues>;
  onCategoryChange: (skillId: string, newCategory: SkillCategory) => void;
  onRemove: (skillId: string) => void;
};

export function SortableSkillRow({
  id,
  index,
  register,
  control,
  onCategoryChange,
  onRemove,
}: SortableSkillRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        SKILL_ROW_GRID,
        "border-border/50 bg-muted/20 rounded-lg border p-3",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab rounded-md p-1 active:cursor-grabbing"
        aria-label="Reorder skill"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        {...register(`skills.${index}.name`)}
        placeholder="Skill name"
        className="border-border bg-background focus:border-accent rounded-md border px-3 py-1.5 text-sm focus:outline-hidden"
      />

      <Controller
        control={control}
        name={`skills.${index}.category`}
        render={({ field }) => (
          <Select
            className="bg-background h-9 min-w-0 rounded-md px-2 py-1.5 text-sm"
            value={field.value}
            onChange={(e) => {
              const next = e.target.value as SkillCategory;
              if (next !== field.value) {
                onCategoryChange(id, next);
              }
            }}
          >
            {Object.entries(SKILL_CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        )}
      />

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
        onClick={() => onRemove(id)}
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
  );
}

export function SkillsColumnHeader() {
  return (
    <div
      className={cn(
        SKILL_ROW_GRID,
        "text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase",
      )}
    >
      <span aria-hidden />
      <span>Skill</span>
      <span>Category</span>
      <span>Proficiency</span>
      <span>Years</span>
      <span aria-hidden />
    </div>
  );
}
