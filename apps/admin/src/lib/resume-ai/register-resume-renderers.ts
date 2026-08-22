import { registerResumePdfRenderer } from "@portfolio/shared/ports";
import { latexAtsResumeRenderer } from "@portfolio/resume-latex/renderer";
import { reactPdfResumeRenderer } from "@portfolio/ui/resume-pdf";

let registered = false;

/** Register all resume PDF renderers (React-PDF + LaTeX ATS). */
export function registerResumeRenderers(): void {
  if (registered) return;
  registerResumePdfRenderer(reactPdfResumeRenderer);
  registerResumePdfRenderer(latexAtsResumeRenderer);
  registered = true;
}
