export function formatGapLabel(gap: string): string {
  return gap
    .replace(/^skill gap:\s*/i, "")
    .replace(/^missing keyword:\s*/i, "")
    .trim();
}

export function formatSalary(job: {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
}): string | null {
  if (job.salary_min == null && job.salary_max == null) return null;
  const currency = job.salary_currency ?? "USD";
  const format = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  if (job.salary_min != null && job.salary_max != null) {
    return `${format(job.salary_min)}–${format(job.salary_max)}`;
  }
  if (job.salary_min != null) return `from ${format(job.salary_min)}`;
  return `up to ${format(job.salary_max!)}`;
}
