import type { ModernBlueDensity } from "./modern-blue-print-spec";

export type ResumePdfMode = "canonical" | "tailored";

export type ResumePdfFit = "one-page" | "guidelines-only";

export type ResumePdfRenderOptions = {
  mode?: ResumePdfMode;
  highlightedSkills?: readonly string[];
  /**
   * How Modern Blue should reduce content before rendering.
   * `one-page` (default) runs the iterative fit-search used by tailored
   * admin exports. `guidelines-only` applies layout caps once and renders
   * at reference density — used by the public `/api/pdf` download.
   */
  fit?: ResumePdfFit;
  /**
   * Epoch ms after which the Modern Blue fit-search must stop iterating and
   * fall back to the best/most-reduced one-page (or, as a last resort,
   * two-page) candidate found so far, instead of continuing to search.
   * Callers should derive this from their own remaining request time budget.
   * Non-Modern-Blue layouts and `fit: "guidelines-only"` ignore this option.
   */
  deadlineAt?: number;
};

export type ResumeDocumentRenderOptions = ResumePdfRenderOptions & {
  density?: ModernBlueDensity;
};
