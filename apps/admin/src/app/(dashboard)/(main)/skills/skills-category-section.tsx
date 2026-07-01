"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import type { SkillCategory } from "@portfolio/shared/schemas";

type SkillsCategorySectionProps = {
  category: SkillCategory;
  skillIds: string[];
  onReorder: (category: SkillCategory, activeId: string, overId: string) => void;
  children: ReactNode;
};

export function SkillsCategorySection({
  category,
  skillIds,
  onReorder,
  children,
}: SkillsCategorySectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(category, String(active.id), String(over.id));
  }

  return (
    <section className="space-y-2">
      <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
        {SKILL_CATEGORIES[category]}
      </h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={skillIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">{children}</div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
