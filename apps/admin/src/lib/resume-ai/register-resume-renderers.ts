import { registerResumePdfRenderer } from "@portfolio/shared/ports";
import { reactPdfResumeRenderer } from "@portfolio/ui/resume-pdf";

let registered = false;

/** Register the React-PDF resume renderer for classic, modern-blue, and ats-resume. */
export function registerResumeRenderers(): void {
  if (registered) return;
  registerResumePdfRenderer(reactPdfResumeRenderer);
  registered = true;
}
