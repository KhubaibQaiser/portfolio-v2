import type {
  ResumePdfRenderInput,
  ResumePdfRenderer,
  ResumePdfRenderResult,
} from "@portfolio/shared/ports/resume-pdf-renderer";
import type { ResumeLayoutComponentKey } from "@portfolio/shared/schemas";
import { assembleResumeDocumentFromData } from "./assemble-document";
import { trimAtsResumeForPage } from "./trim-for-page";
import { cleanupXeLatexWorkDir, compileXeLatex } from "./xelatex-runner";
import { verifyResumePdf } from "./verify-resume-pdf";

const ATS_KEY: ResumeLayoutComponentKey = "ats-resume";

export const latexAtsResumeRenderer: ResumePdfRenderer = {
  supports(componentKey: ResumeLayoutComponentKey): boolean {
    return componentKey === ATS_KEY;
  },

  async render(input: ResumePdfRenderInput): Promise<ResumePdfRenderResult> {
    const maxBullets = Math.min(
      input.layout.guidelines.validation.maxBulletsPerRole,
      input.layout.guidelines.formatting.layout.maxBulletsPerJob,
    );

    const trimmed = trimAtsResumeForPage(input.data, maxBullets);
    const includeProjects = input.layout.guidelines.sections.projects;
    const texSource = assembleResumeDocumentFromData(trimmed, includeProjects);

    const { pdfBuffer, workDir } = await compileXeLatex(texSource);
    try {
      const verifyReport = await verifyResumePdf(pdfBuffer, { requireOnePage: true });
      return {
        buffer: pdfBuffer,
        fitReport: {
          engine: "xelatex",
          componentKey: ATS_KEY,
          mode: input.mode,
          pageCount: verifyReport.pageCount,
          trimmedRoles: trimmed.experience.length,
        },
        artifacts: { texSource },
      };
    } finally {
      await cleanupXeLatexWorkDir(workDir);
    }
  },
};
