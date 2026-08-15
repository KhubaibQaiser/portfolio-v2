import { renderToBuffer } from "@react-pdf/renderer";
import { getDocumentProxy } from "unpdf";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { ResumeLayout } from "@portfolio/shared/schemas";
import {
  clampLongestModernBlueContent,
  cloneModernBlueProjection,
  type FitReport,
  projectModernBlueResume,
  removeLeastRelevantRole,
  removeLeastRelevantSkill,
  removeLowestPriorityOptionalSection,
  syncModernBlueFitReport,
  type ModernBlueProjection,
} from "./fit-modern-blue-resume";
import { renderResumeDocument } from "./layout-registry";
import type { ModernBlueDensity } from "./modern-blue-print-spec";
import type { ResumePdfRenderOptions } from "./resume-render-options";

const DENSITIES: ModernBlueDensity[] = ["reference", "elegantCompact", "fitCompact"];
const MAX_RENDER_ATTEMPTS = 128;

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

type FittingCandidate = {
  buffer: Buffer;
  projection: ModernBlueProjection;
  densityIndex: number;
  weightedBulletValue: number;
  skillCount: number;
};

function countSkills(projection: ModernBlueProjection): number {
  return projection.data.skills.reduce((total, group) => total + group.items.length, 0);
}

function weightedBulletValue(projection: ModernBlueProjection): number {
  const roleCount = projection.data.experience.length;
  return projection.data.experience.reduce(
    (total, experience, index) =>
      total + experience.bullets.length * Math.max(1, roleCount - index),
    0,
  );
}

function isBetterCandidate(
  candidate: FittingCandidate,
  current: FittingCandidate | null,
): boolean {
  if (!current) return true;
  const candidateRoles = candidate.projection.data.experience.length;
  const currentRoles = current.projection.data.experience.length;
  if (candidateRoles !== currentRoles) return candidateRoles > currentRoles;
  if (candidate.weightedBulletValue !== current.weightedBulletValue) {
    return candidate.weightedBulletValue > current.weightedBulletValue;
  }
  if (candidate.skillCount !== current.skillCount) {
    return candidate.skillCount > current.skillCount;
  }
  return candidate.densityIndex < current.densityIndex;
}

export async function renderResumePdfBuffer(
  data: ResumeData,
  layout: ResumeLayout | null,
  options: ResumePdfRenderOptions = {},
): Promise<RenderedResumePdf> {
  const mode = options.mode ?? "canonical";
  if (layout?.component_key !== "modern-blue") {
    return {
      buffer: await renderToBuffer(
        renderResumeDocument(data, layout, { ...options, mode }),
      ),
      fitReport: null,
    };
  }

  let renderAttempts = 0;
  const fallbackSteps: string[] = [];
  const originalRoleCount = data.experience.length;
  let workingData = data;

  const renderProjection = async (
    projection: ModernBlueProjection,
    density: ModernBlueDensity,
  ): Promise<{ buffer: Buffer; pageCount: number }> => {
    renderAttempts += 1;
    if (renderAttempts > MAX_RENDER_ATTEMPTS) {
      throw new Error(
        `Modern Blue exceeded the ${MAX_RENDER_ATTEMPTS}-attempt fitting limit.`,
      );
    }
    const buffer = await renderToBuffer(
      renderResumeDocument(projection.data, layout, {
        ...options,
        mode,
        density,
      }),
    );
    const pageCount = await getPageCount(buffer);
    if (pageCount < 1) {
      throw new Error("Resume PDF rendered without a page.");
    }
    return { buffer, pageCount };
  };

  while (workingData.experience.length > 0) {
    let bestCandidate: FittingCandidate | null = null;

    for (let densityIndex = 0; densityIndex < DENSITIES.length; densityIndex += 1) {
      const density = DENSITIES[densityIndex]!;
      const maximum = projectModernBlueResume(workingData, layout.guidelines, {
        mode,
      });
      const baseline = projectModernBlueResume(workingData, layout.guidelines, {
        mode,
        minimumBullets: true,
      });
      const baselineResult = await renderProjection(baseline, density);
      if (baselineResult.pageCount !== 1) continue;

      let accepted = baseline;
      let acceptedBuffer = baselineResult.buffer;
      for (
        let experienceIndex = 0;
        experienceIndex < maximum.data.experience.length;
        experienceIndex += 1
      ) {
        const maximumExperience = maximum.data.experience[experienceIndex]!;
        const baselineCount = baseline.data.experience[experienceIndex]!.bullets.length;
        for (
          let bulletIndex = baselineCount;
          bulletIndex < maximumExperience.bullets.length;
          bulletIndex += 1
        ) {
          const proposed = cloneModernBlueProjection(accepted);
          proposed.data.experience[experienceIndex]!.bullets.push(
            maximumExperience.bullets[bulletIndex]!,
          );
          const proposedResult = await renderProjection(proposed, density);
          if (proposedResult.pageCount === 1) {
            accepted = proposed;
            acceptedBuffer = proposedResult.buffer;
          }
        }
      }

      const candidate: FittingCandidate = {
        buffer: acceptedBuffer,
        projection: accepted,
        densityIndex,
        weightedBulletValue: weightedBulletValue(accepted),
        skillCount: countSkills(accepted),
      };
      if (isBetterCandidate(candidate, bestCandidate)) {
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      const density = DENSITIES[bestCandidate.densityIndex]!;
      const projection = bestCandidate.projection;
      projection.report.mode = mode;
      projection.report.density = density;
      projection.report.pageCount = 1;
      projection.report.candidateRoles = originalRoleCount;
      projection.report.renderAttempts = renderAttempts;
      projection.report.fallbackSteps = [...fallbackSteps];
      if (workingData.experience.length < originalRoleCount) {
        projection.report.roleDropReason =
          "All retained roles at protected bullet minimums still overflowed after density and lower-priority content fallbacks.";
      }
      syncModernBlueFitReport(projection, data);
      return { buffer: bestCandidate.buffer, fitReport: projection.report };
    }

    const fallback = projectModernBlueResume(workingData, layout.guidelines, {
      mode,
      minimumBullets: true,
    });
    if (removeLeastRelevantSkill(fallback)) {
      fallbackSteps.push("removed-lowest-priority-skill");
      workingData = fallback.data;
      continue;
    }
    if (removeLowestPriorityOptionalSection(fallback)) {
      fallbackSteps.push(
        `removed-optional-section:${fallback.report.droppedSections.at(-1) ?? "unknown"}`,
      );
      workingData = fallback.data;
      continue;
    }
    if (clampLongestModernBlueContent(fallback)) {
      fallbackSteps.push("clamped-overlong-content");
      workingData = fallback.data;
      continue;
    }
    if (
      removeLeastRelevantRole(
        fallback,
        Math.max(1, layout.guidelines.validation.minExperienceItems),
      )
    ) {
      fallbackSteps.push("removed-oldest-role");
      workingData = fallback.data;
      continue;
    }
    break;
  }

  throw new Error(
    `Modern Blue could not fit one page after ${renderAttempts} render attempts.`,
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
