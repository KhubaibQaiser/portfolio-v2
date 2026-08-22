import type { ResumeLayout } from "@portfolio/shared/schemas";

/** Section 8 naming: Khubaib_Qaiser_Resume_{Company}.pdf for ATS exports. */
export function buildResumeExportFilename(
  name: string,
  layout: ResumeLayout,
  company?: string,
  fallbackTitle?: string,
): string {
  const slug = (value: string) =>
    value
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");

  if (layout.component_key === "ats-resume" && company?.trim()) {
    return `Khubaib_Qaiser_Resume_${slug(company)}.pdf`;
  }

  const parts = [name, fallbackTitle ?? "Resume"]
    .map((p) => p.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  return `${parts.join("-")}.pdf`;
}
