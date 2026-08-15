import { differenceInYears } from "date-fns";
import { parseExperienceDateString } from "./experience-dates";

export const OLD_ROLE_THRESHOLD_YEARS = 5;
export const OLD_ROLE_MAX_BULLETS = 2;

export type DatedExperience = {
  startDate: string;
  endDate: string | null;
};

export type BulletBudgetInput = DatedExperience & {
  index: number;
  maxBullets: number;
  now?: Date;
};

export type BudgetableExperience = DatedExperience & {
  bullets: string[];
};

export type AllocatedBulletBudgets<T extends BudgetableExperience> = {
  experiences: T[];
  budgets: number[];
  droppedBullets: number;
};

function roleAgeYears(
  startDate: string,
  endDate: string | null,
  now: Date,
): number | null {
  const referenceDate = parseExperienceDateString(endDate ?? startDate);
  if (referenceDate.getTime() === 0) return null;
  return Math.max(0, differenceInYears(now, referenceDate));
}

export function sortDatedExperiencesByRecency<T extends DatedExperience>(
  experiences: T[],
): T[] {
  return [...experiences].sort((left, right) => {
    const leftEnd = left.endDate
      ? parseExperienceDateString(left.endDate).getTime()
      : Number.MAX_SAFE_INTEGER;
    const rightEnd = right.endDate
      ? parseExperienceDateString(right.endDate).getTime()
      : Number.MAX_SAFE_INTEGER;
    if (leftEnd !== rightEnd) return rightEnd - leftEnd;
    return (
      parseExperienceDateString(right.startDate).getTime() -
      parseExperienceDateString(left.startDate).getTime()
    );
  });
}

export function bulletBudgetForRole({
  index,
  maxBullets,
  startDate,
  endDate,
  now = new Date(),
}: BulletBudgetInput): number {
  const recencyBudget = Math.max(1, maxBullets - index);
  const age = roleAgeYears(startDate, endDate, now);
  return age !== null && age >= OLD_ROLE_THRESHOLD_YEARS
    ? Math.min(recencyBudget, OLD_ROLE_MAX_BULLETS)
    : recencyBudget;
}

export function allocateRecencyBulletBudgets<T extends BudgetableExperience>(
  experiences: T[],
  maxBullets: number,
  now: Date = new Date(),
): AllocatedBulletBudgets<T> {
  const sorted = sortDatedExperiencesByRecency(experiences);
  let droppedBullets = 0;
  const budgets = sorted.map((experience, index) =>
    bulletBudgetForRole({ ...experience, index, maxBullets, now }),
  );
  return {
    experiences: sorted.map((experience, index) => {
      const budget = budgets[index]!;
      droppedBullets += Math.max(0, experience.bullets.length - budget);
      return { ...experience, bullets: experience.bullets.slice(0, budget) };
    }),
    budgets,
    droppedBullets,
  };
}

export function describeBulletBudgetRules(maxBullets: number): string {
  return `Keep experiences newest-first. Give the most recent role up to ${maxBullets} bullets, then reduce the budget by one bullet for each older role (minimum one). Roles that ended at least ${OLD_ROLE_THRESHOLD_YEARS} years ago, or ongoing roles that started at least ${OLD_ROLE_THRESHOLD_YEARS} years ago, may have at most ${OLD_ROLE_MAX_BULLETS} bullets.`;
}
