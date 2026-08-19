import type { ModernBlueDensity } from "./modern-blue-print-spec";

export type ResumePdfMode = "canonical" | "tailored";

export type ResumePdfRenderOptions = {
  mode?: ResumePdfMode;
  highlightedSkills?: readonly string[];
  /**
   * Epoch ms after which the Modern Blue fit-search must stop iterating and
   * fall back to the best/most-reduced one-page (or, as a last resort,
   * two-page) candidate found so far, instead of continuing to search.
   * Callers should derive this from their own remaining request time budget.
   * Non-Modern-Blue layouts render once and ignore this option.
   */
  deadlineAt?: number;
};

export type ResumeDocumentRenderOptions = ResumePdfRenderOptions & {
  density?: ModernBlueDensity;
};
