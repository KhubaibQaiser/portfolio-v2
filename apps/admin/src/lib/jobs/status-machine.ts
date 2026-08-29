import type { JobStatus } from "@portfolio/shared/schemas";

const ALLOWED: Record<JobStatus, readonly JobStatus[]> = {
  new: ["reviewing", "applied", "discarded", "closed"],
  reviewing: ["applied", "discarded", "snoozed", "closed", "new"],
  applied: ["snoozed", "closed", "reviewing"],
  snoozed: ["applied", "closed", "reviewing"],
  discarded: ["reviewing", "new"],
  closed: ["reviewing"],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function followUpAtForApply(now = new Date()): string {
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function snoozeFollowUp(
  currentFollowUpAt: string | null,
  now = new Date(),
): string {
  const base = currentFollowUpAt ? Date.parse(currentFollowUpAt) : now.getTime();
  const start = Number.isNaN(base) || base < now.getTime() ? now.getTime() : base;
  return new Date(start + 7 * 24 * 60 * 60 * 1000).toISOString();
}
