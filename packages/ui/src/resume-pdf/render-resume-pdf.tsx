import { renderToBuffer } from "@react-pdf/renderer";
import { getDocumentProxy } from "unpdf";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { ResumeLayout } from "@portfolio/shared/schemas";
import {
  clampLongestModernBlueContent,
  type FitReport,
  projectModernBlueResume,
  removeLeastRelevantBullet,
  removeLeastRelevantRole,
  removeLeastRelevantSkill,
  removeLowestPriorityOptionalSection,
} from "./fit-modern-blue-resume";
import { renderResumeDocument } from "./layout-registry";
import type { ModernBlueDensity } from "./modern-blue-print-spec";

const DENSITIES: ModernBlueDensity[] = ["reference", "elegantCompact", "fitCompact"];
const MAX_RENDER_ATTEMPTS = 64;

export type RenderedResumePdf = {
  buffer: Buffer;
  fitReport: FitReport | null;
};

async function getPageCount(buffer: Buffer): Promise<number> {
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    return document.numPages;
  } finally {
    await document.destroy();
  }
}

export async function renderResumePdfBuffer(
  data: ResumeData,
  layout: ResumeLayout | null,
): Promise<RenderedResumePdf> {
  if (layout?.component_key !== "modern-blue") {
    return {
      buffer: await renderToBuffer(renderResumeDocument(data, layout)),
      fitReport: null,
    };
  }

  const projection = projectModernBlueResume(data, layout.guidelines);
  let densityIndex = 0;

  for (let attempt = 0; attempt < MAX_RENDER_ATTEMPTS; attempt += 1) {
    const density = DENSITIES[densityIndex]!;
    const buffer = await renderToBuffer(
      renderResumeDocument(projection.data, layout, { density }),
    );
    const pageCount = await getPageCount(buffer);
    projection.report.density = density;
    projection.report.pageCount = pageCount;

    if (pageCount === 1) {
      return { buffer, fitReport: projection.report };
    }
    if (pageCount < 1) {
      throw new Error("Resume PDF rendered without a page.");
    }

    const changed =
      removeLeastRelevantBullet(projection) ||
      removeLeastRelevantRole(
        projection,
        Math.max(1, layout.guidelines.validation.minExperienceItems),
      ) ||
      removeLowestPriorityOptionalSection(projection) ||
      removeLeastRelevantSkill(projection);
    if (changed) continue;

    if (densityIndex < DENSITIES.length - 1) {
      densityIndex += 1;
      continue;
    }
    if (clampLongestModernBlueContent(projection)) continue;

    throw new Error(
      `Modern Blue could not fit one page after ${attempt + 1} render attempts.`,
    );
  }

  throw new Error(
    `Modern Blue exceeded the ${MAX_RENDER_ATTEMPTS}-attempt fitting limit.`,
  );
}

export function describeFitReport(report: FitReport | null): string | null {
  if (!report) return null;
  const changes = [
    report.droppedRoles > 0
      ? `${report.droppedRoles} older role${report.droppedRoles === 1 ? "" : "s"}`
      : null,
    report.droppedBullets > 0
      ? `${report.droppedBullets} lower-priority bullet${report.droppedBullets === 1 ? "" : "s"}`
      : null,
    report.droppedSkills > 0
      ? `${report.droppedSkills} lower-priority skill${report.droppedSkills === 1 ? "" : "s"}`
      : null,
    report.droppedSections.length > 0
      ? `${report.droppedSections.join(", ")} section${report.droppedSections.length === 1 ? "" : "s"}`
      : null,
  ].filter((value): value is string => Boolean(value));

  return changes.length > 0
    ? `Removed ${changes.join(", ")} to keep Modern Blue on one page.`
    : `Modern Blue fits one page at ${report.density} density.`;
}
