/** Normalize employment period to `MM/YYYY - MM/YYYY` for the ATS layout. */
export function formatAtsEmploymentPeriod(period: string): string {
  const trimmed = period.trim();
  if (/^\d{2}\/\d{4}\s*-\s*(\d{2}\/\d{4}|Present)$/i.test(trimmed)) {
    return trimmed.replace(/\s*-\s*/g, " - ");
  }
  return trimmed.replace(/[\u2013\u2014]/g, "-").replace(/\s*-\s*/g, " - ");
}
