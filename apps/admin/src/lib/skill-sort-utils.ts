import { arrayMove } from "@dnd-kit/sortable";
import {
  SKILL_CATEGORIES,
  getSkillCategorySortWeight,
} from "@portfolio/shared/constants";
import type { Skill, SkillCategory } from "@portfolio/shared/schemas";

export function getCategoryDisplayOrder(
  categories: Iterable<SkillCategory>,
): SkillCategory[] {
  const unique = [...new Set(categories)];
  return unique.sort((a, b) => {
    const weightDiff = getSkillCategorySortWeight(b) - getSkillCategorySortWeight(a);
    if (weightDiff !== 0) return weightDiff;
    const labelA = SKILL_CATEGORIES[a];
    const labelB = SKILL_CATEGORIES[b];
    return labelA.localeCompare(labelB);
  });
}

export function groupSkillsByCategory(skills: Skill[]): Map<SkillCategory, Skill[]> {
  const groups = new Map<SkillCategory, Skill[]>();
  for (const skill of skills) {
    const list = groups.get(skill.category) ?? [];
    list.push(skill);
    groups.set(skill.category, list);
  }
  for (const [category, list] of groups) {
    groups.set(
      category,
      [...list].sort((a, b) => a.sort_order - b.sort_order),
    );
  }
  return groups;
}

export function flattenSkillGroups(
  groups: Map<SkillCategory, Skill[]>,
  order: SkillCategory[],
): Skill[] {
  const result: Skill[] = [];
  for (const category of order) {
    const items = groups.get(category);
    if (!items?.length) continue;
    items.forEach((skill, index) => {
      result.push({ ...skill, sort_order: index });
    });
  }
  return result;
}

export function normalizeSkillsOrder(skills: Skill[]): Skill[] {
  const groups = groupSkillsByCategory(skills);
  const order = getCategoryDisplayOrder(groups.keys());
  return flattenSkillGroups(groups, order);
}

export function reorderSkillInCategory(
  skills: Skill[],
  category: SkillCategory,
  activeId: string,
  overId: string,
): Skill[] {
  const groups = groupSkillsByCategory(skills);
  const categorySkills = groups.get(category);
  if (!categorySkills) return skills;

  const oldIndex = categorySkills.findIndex((s) => s.id === activeId);
  const newIndex = categorySkills.findIndex((s) => s.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return skills;

  groups.set(category, arrayMove(categorySkills, oldIndex, newIndex));
  const order = getCategoryDisplayOrder(groups.keys());
  return flattenSkillGroups(groups, order);
}

export function moveSkillToCategory(
  skills: Skill[],
  skillId: string,
  newCategory: SkillCategory,
): Skill[] {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill || skill.category === newCategory) return skills;

  const groups = groupSkillsByCategory(skills);
  const oldCategory = skill.category;

  const oldList = groups.get(oldCategory) ?? [];
  groups.set(
    oldCategory,
    oldList.filter((s) => s.id !== skillId),
  );

  const newList = groups.get(newCategory) ?? [];
  groups.set(newCategory, [...newList, { ...skill, category: newCategory }]);

  const order = getCategoryDisplayOrder(groups.keys());
  return flattenSkillGroups(groups, order);
}

export function removeSkillAndReindex(skills: Skill[], skillId: string): Skill[] {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return skills;

  const groups = groupSkillsByCategory(skills);
  const list = groups.get(skill.category) ?? [];
  groups.set(
    skill.category,
    list.filter((s) => s.id !== skillId),
  );

  const order = getCategoryDisplayOrder(groups.keys());
  return flattenSkillGroups(groups, order);
}

export function nextSortOrderInCategory(
  skills: Skill[],
  category: SkillCategory,
): number {
  return skills.filter((s) => s.category === category).length;
}

export function insertNewSkill(skills: Skill[], draft: Skill): Skill[] {
  const groups = groupSkillsByCategory(skills);
  const list = groups.get(draft.category) ?? [];
  const sortOrder = list.length;
  groups.set(draft.category, [...list, { ...draft, sort_order: sortOrder }]);

  const order = getCategoryDisplayOrder(groups.keys());
  return flattenSkillGroups(groups, order);
}
