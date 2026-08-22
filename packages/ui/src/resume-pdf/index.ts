export { ResumeDocument } from "./resume-document";
export { ResumeModernDocument } from "./resume-modern-document";
export { CoverLetterDocument, type CoverLetterMeta } from "./cover-letter-document";
export { COLORS, baseStyles } from "./styles";
export { renderResumeDocument } from "./layout-registry";
export {
  describeFitReport,
  renderResumePdfBuffer,
  type RenderedResumePdf,
} from "./render-resume-pdf";
export type { FitReport } from "./fit-modern-blue-resume";
export type {
  ResumeDocumentRenderOptions,
  ResumePdfFit,
  ResumePdfMode,
  ResumePdfRenderOptions,
} from "./resume-render-options";
export { registerResumePdfFonts } from "./register-fonts";
export { reactPdfResumeRenderer } from "./react-pdf-resume-renderer";
