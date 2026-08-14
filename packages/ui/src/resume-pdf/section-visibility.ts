import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";

export function isVisibleSection(data: ResumeData, key: string): boolean {
  return data.visibleSections.includes(key);
}

export function isGuidelineSectionOn(
  guidelines: VariantGuidelines | undefined,
  key: keyof VariantGuidelines["sections"],
): boolean {
  if (!guidelines) return true;
  return guidelines.sections[key];
}

export function showResumePdfSection(
  data: ResumeData,
  guidelines: VariantGuidelines | undefined,
  visibleKey: string,
  guidelineKey: keyof VariantGuidelines["sections"],
): boolean {
  return (
    isVisibleSection(data, visibleKey) && isGuidelineSectionOn(guidelines, guidelineKey)
  );
}
