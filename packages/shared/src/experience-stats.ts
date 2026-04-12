/**
 * Count distinct employers from experience rows (trimmed company name).
 */
export function uniqueCompanyCount(experience: { company: string }[]): number {
  return new Set(experience.map((e) => e.company.trim())).size;
}
