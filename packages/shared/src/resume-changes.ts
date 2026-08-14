import type { ResumeData } from "./resume-data";
import { stableExperienceIndex } from "./resume-data";

export type TailoredResumeDiffInput = {
  summary: string;
  titleOverride?: string | null;
  experiences: Array<{
    experienceId: string;
    bullets: Array<{ text: string; sourceBulletIndex: number }>;
  }>;
  skills: Array<{ category: string; items: string[] }>;
};

/**
 * Short, admin-facing list of what the model changed versus the CMS resume.
 * Best-effort: never throws on partial or malformed tailored payloads.
 */
export function describeAppliedResumeChanges(
  base: ResumeData,
  tailored: TailoredResumeDiffInput,
  role?: string | null,
): string[] {
  const changes: string[] = [];
  const target = role?.trim();

  if (tailored.summary && tailored.summary.trim() !== base.summary.trim()) {
    changes.push(
      target
        ? `Regenerated summary for ${target}`
        : "Regenerated summary for the job description",
    );
  }

  if (tailored.titleOverride?.trim() && tailored.titleOverride.trim() !== base.title) {
    changes.push(`Set title to ${tailored.titleOverride.trim()}`);
  }

  const tailoredIds = tailored.experiences.map((e) => e.experienceId);
  const originalOrder = base.experience.map((_, i) => `e${i + 1}`);
  const orderChanged =
    tailoredIds.length > 0 &&
    (tailoredIds.length !== originalOrder.length ||
      tailoredIds.some((id, i) => id !== originalOrder[i]));

  if (orderChanged && tailored.experiences[0]) {
    const firstIndex = stableExperienceIndex(tailored.experiences[0].experienceId);
    const firstCompany =
      firstIndex !== null ? base.experience[firstIndex]?.company : undefined;
    if (firstCompany) {
      changes.push(`Reordered experience; ${firstCompany} first`);
    } else {
      changes.push("Reordered experience by job relevance");
    }
  }

  const dropped = Math.max(0, base.experience.length - tailored.experiences.length);
  if (dropped > 0) {
    changes.push(`Dropped ${dropped} less relevant ${dropped === 1 ? "role" : "roles"}`);
  }

  let rewritten = 0;
  let bolded = 0;
  for (const exp of tailored.experiences) {
    const index = stableExperienceIndex(exp.experienceId);
    const source = index !== null ? base.experience[index] : undefined;
    for (const bullet of exp.bullets) {
      if (/\*\*[^*]+\*\*/.test(bullet.text)) bolded += 1;
      const sourceText = source?.bullets[bullet.sourceBulletIndex];
      if (!sourceText || sourceText.trim() !== bullet.text.replace(/\*\*/g, "").trim()) {
        rewritten += 1;
      }
    }
  }
  if (rewritten > 0) {
    changes.push(`Rewrote ${rewritten} ${rewritten === 1 ? "bullet" : "bullets"}`);
  }
  if (bolded > 0) {
    changes.push(`Highlighted ${bolded} JD ${bolded === 1 ? "keyword" : "keywords"}`);
  }

  if (tailored.skills.length > 0) {
    const first = tailored.skills[0]?.category;
    const baseFirst = base.skills[0]?.category;
    if (first && first !== baseFirst) {
      changes.push(`Surfaced ${first} skills first`);
    }
  }

  return changes;
}
