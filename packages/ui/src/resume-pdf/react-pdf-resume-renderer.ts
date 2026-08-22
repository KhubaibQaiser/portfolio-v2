import type {
  ResumePdfRenderInput,
  ResumePdfRenderer,
  ResumePdfRenderResult,
} from "@portfolio/shared/ports/resume-pdf-renderer";
import type { ResumeLayoutComponentKey } from "@portfolio/shared/schemas";
import { renderResumePdfBuffer } from "./render-resume-pdf";

const REACT_PDF_KEYS: ResumeLayoutComponentKey[] = ["classic", "modern-blue"];

export const reactPdfResumeRenderer: ResumePdfRenderer = {
  supports(componentKey: ResumeLayoutComponentKey): boolean {
    return REACT_PDF_KEYS.includes(componentKey);
  },

  async render(input: ResumePdfRenderInput): Promise<ResumePdfRenderResult> {
    const { buffer, fitReport } = await renderResumePdfBuffer(input.data, input.layout, {
      mode: input.mode,
      highlightedSkills: input.highlightedSkills,
      deadlineAt: input.deadlineAt,
      fit: input.mode === "canonical" ? "guidelines-only" : "one-page",
    });

    return {
      buffer,
      fitReport: fitReport as Record<string, unknown> | null,
    };
  },
};
