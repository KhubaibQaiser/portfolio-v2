import type { ComponentProps, ReactElement } from "react";
import { Document } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { ResumeLayout } from "@portfolio/shared/schemas";
import { classicGuidelines } from "@portfolio/shared/schemas";
import { ResumeDocument } from "./resume-document";
import { ResumeModernDocument } from "./resume-modern-document";
import { registerResumePdfFonts } from "./register-fonts";
import type { ModernBlueDensity } from "./modern-blue-print-spec";

type ResumePdfElement = ReactElement<ComponentProps<typeof Document>>;

type ResumeRenderOptions = {
  density?: ModernBlueDensity;
};

export function renderResumeDocument(
  data: ResumeData,
  layout: ResumeLayout | null,
  options: ResumeRenderOptions = {},
): ResumePdfElement {
  registerResumePdfFonts();
  const guidelines = layout?.guidelines ?? classicGuidelines();
  const key = layout?.component_key ?? "classic";
  if (key === "modern-blue") {
    return (
      <ResumeModernDocument
        data={data}
        guidelines={guidelines}
        density={options.density}
      />
    ) as ResumePdfElement;
  }
  return (<ResumeDocument data={data} guidelines={guidelines} />) as ResumePdfElement;
}
