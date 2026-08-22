/** Normalize employment period to MM/YYYY - MM/YYYY for ATS layout. */
export function formatEmploymentPeriod(period: string): string {
  const trimmed = period.trim();
  // Already numeric MM/YYYY style from CMS
  if (/^\d{2}\/\d{4}\s*-\s*(\d{2}\/\d{4}|Present)$/i.test(trimmed)) {
    return trimmed.replace(/\s*-\s*/g, " - ");
  }
  return trimmed.replace(/\u2013|\u2014|–|—/g, "-").replace(/\s*-\s*/g, " - ");
}
