import type { ResumeData } from "../resume-data";
import type { ResumeLayout, ResumeLayoutComponentKey } from "../schemas/resume-layout";

export type ResumePdfRenderMode = "canonical" | "tailored";

export type ResumePdfRenderInput = {
  data: ResumeData;
  layout: ResumeLayout;
  mode: ResumePdfRenderMode;
  highlightedSkills?: string[];
  deadlineAt?: number;
  jobDescription?: string;
};

export type ResumePdfRenderResult = {
  buffer: Uint8Array;
  fitReport: Record<string, unknown> | null;
  artifacts?: { texSource?: string };
};

export type ResumePdfRenderer = {
  supports(componentKey: ResumeLayoutComponentKey): boolean;
  render(input: ResumePdfRenderInput): Promise<ResumePdfRenderResult>;
};

const renderers: ResumePdfRenderer[] = [];

export function registerResumePdfRenderer(renderer: ResumePdfRenderer): void {
  renderers.push(renderer);
}

export function getResumePdfRenderer(
  componentKey: ResumeLayoutComponentKey,
): ResumePdfRenderer {
  const renderer = renderers.find((r) => r.supports(componentKey));
  if (!renderer) {
    throw new Error(`No ResumePdfRenderer registered for component_key: ${componentKey}`);
  }
  return renderer;
}

export function clearResumePdfRenderersForTests(): void {
  renderers.length = 0;
}
