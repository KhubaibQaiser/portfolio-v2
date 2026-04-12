import { parse, isValid } from "date-fns";
import { enUS } from "date-fns/locale";

/** Formats used in DB / admin (e.g. seed: "Aug 2024") plus ISO-style fallbacks. */
const FORMATS = [
  "MMM yyyy",
  "MMMM yyyy",
  "yyyy-MM-dd",
  "yyyy-MM",
  "MM/dd/yyyy",
  "yyyy/MM/dd",
] as const;

/**
 * Parse a work-history start/end string for sorting. Invalid or empty → epoch (sorts last when descending).
 */
export function parseExperienceDateString(s: string | null | undefined): Date {
  if (s == null || String(s).trim() === "") return new Date(0);
  const t = String(s).trim();
  for (const fmt of FORMATS) {
    const d = parse(t, fmt, new Date(), { locale: enUS });
    if (isValid(d)) return d;
  }
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) return new Date(ms);
  return new Date(0);
}

/**
 * Timestamp for sorting by end date: ongoing roles (no end date) sort as "latest" so they appear first.
 */
function endTimeForSort(endDate: string | null | undefined): number {
  if (endDate == null || String(endDate).trim() === "") {
    return Number.MAX_SAFE_INTEGER;
  }
  return parseExperienceDateString(endDate).getTime();
}

/**
 * Reverse-chronological work history:
 * 1. By end date (Present / ongoing first, then most recently ended)
 * 2. Tiebreak by start date (newest first)
 */
export function sortExperienceByRecencyDesc<
  T extends { start_date: string; end_date: string | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const endDiff = endTimeForSort(b.end_date) - endTimeForSort(a.end_date);
    if (endDiff !== 0) return endDiff;
    return (
      parseExperienceDateString(b.start_date).getTime() -
      parseExperienceDateString(a.start_date).getTime()
    );
  });
}
