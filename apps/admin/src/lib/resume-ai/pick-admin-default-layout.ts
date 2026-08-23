import type { ResumeLayout } from "@portfolio/shared/schemas";
import { pickDefaultResumeLayout } from "@portfolio/shared/schemas";

/**
 * Admin Resume AI default layout. On fixture backend (localhost), prefer
 * ats-resume so tailoring tests hit that layout without manual selection.
 * Public `/api/pdf` uses pickDefaultResumeLayout (whatever is default in CMS).
 */
export function pickAdminResumeGeneratorDefaultLayout(
  layouts: ResumeLayout[],
): ResumeLayout | null {
  if (layouts.length === 0) return null;

  const envOverride = process.env.ADMIN_RESUME_DEFAULT_LAYOUT?.trim();
  if (envOverride) {
    const byKey = layouts.find((l) => l.component_key === envOverride);
    if (byKey) return byKey;
    const byId = layouts.find((l) => l.id === envOverride);
    if (byId) return byId;
  }

  if (process.env.DATA_BACKEND === "fixture") {
    const ats = layouts.find((l) => l.component_key === "ats-resume");
    if (ats) return ats;
  }

  return pickDefaultResumeLayout(layouts);
}
