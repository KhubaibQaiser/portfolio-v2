import type { ResumeData } from "@portfolio/shared/resume-data";

function totalBullets(experience: ResumeData["experience"]): number {
  return experience.reduce((sum, exp) => sum + exp.bullets.length, 0);
}

function cloneExperience(data: ResumeData): ResumeData["experience"] {
  return data.experience.map((exp) => ({
    ...exp,
    bullets: [...exp.bullets],
  }));
}

/** Drop one bullet from the oldest role that still has more than one. */
export function trimOneOldestAtsBullet(data: ResumeData): ResumeData | null {
  const experience = cloneExperience(data);
  for (let i = experience.length - 1; i >= 0; i -= 1) {
    const role = experience[i]!;
    if (role.bullets.length > 1) {
      role.bullets.pop();
      return { ...data, experience };
    }
  }
  return null;
}

/**
 * Never drop roles. Trim bullets from oldest roles first, then cap per-role
 * counts so newer roles keep more bullets.
 */
export function trimAtsResumeForPage(
  data: ResumeData,
  maxBulletsPerRole: number,
): ResumeData {
  const experience = cloneExperience(data);
  const maxTotalBullets = maxBulletsPerRole * experience.length + 4;

  while (totalBullets(experience) > maxTotalBullets && experience.length > 0) {
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

  experience.forEach((exp, index) => {
    const budget = Math.max(1, maxBulletsPerRole - Math.floor(index / 2));
    if (exp.bullets.length > budget) {
      exp.bullets = exp.bullets.slice(0, budget);
    }
  });

  return { ...data, experience };
}
