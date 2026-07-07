import { format, isValid, parse } from "date-fns";

const STORAGE_FORMAT = "dd-MM-yyyy";
const DISPLAY_FORMAT = "d MMMM yyyy";

export function parseRecommendationDate(s: string | null | undefined): Date {
  if (s == null || s.trim() === "") return new Date(0);
  const d = parse(s.trim(), STORAGE_FORMAT, new Date());
  return isValid(d) ? d : new Date(0);
}

export function formatRecommendationDate(s: string): string | null {
  const d = parseRecommendationDate(s);
  if (d.getTime() === 0) return null;
  return format(d, DISPLAY_FORMAT);
}

export function sortRecommendationsByDateDesc<T extends { recommended_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      parseRecommendationDate(b.recommended_at).getTime() -
      parseRecommendationDate(a.recommended_at).getTime(),
  );
}
