import type { ModernBlueDensity } from "./modern-blue-print-spec";

export type ResumePdfMode = "canonical" | "tailored";

export type ResumePdfRenderOptions = {
  mode?: ResumePdfMode;
  highlightedSkills?: readonly string[];
};

export type ResumeDocumentRenderOptions = ResumePdfRenderOptions & {
  density?: ModernBlueDensity;
};
