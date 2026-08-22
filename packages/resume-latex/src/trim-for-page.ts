import type { ResumeData } from "@portfolio/shared/resume-data";

/**
 * Section 5 content trim: never drop roles; trim bullets from oldest roles first.
 */
export function trimAtsResumeForPage(
  data: ResumeData,
  maxBulletsPerRole: number,
): ResumeData {
  const experience = data.experience.map((exp) => ({
    ...exp,
    bullets: [...exp.bullets],
  }));

  const totalBullets = () =>
    experience.reduce((sum, exp) => sum + exp.bullets.length, 0);

  // Rough page budget — trim oldest roles' bullets until within budget
  const maxTotalBullets = maxBulletsPerRole * experience.length + 4;

  while (totalBullets() > maxTotalBullets && experience.length > 0) {
    let trimmed = false;
    for (let i = experience.length - 1; i >= 0; i -= 1) {
      const role = experience[i]!;
      if (role.bullets.length > 1) {
        role.bullets.pop();
        trimmed = true;
        break;
      }
    }
    if (!trimmed) break;
  }

  // Cap per-role bullets (newest roles keep more via reverse index)
  experience.forEach((exp, index) => {
    const budget = Math.max(1, maxBulletsPerRole - Math.floor(index / 2));
    if (exp.bullets.length > budget) {
      exp.bullets = exp.bullets.slice(0, budget);
    }
  });

  return { ...data, experience };
}
