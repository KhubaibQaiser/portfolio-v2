import type { CandidateIdMap } from "../context/build-candidate-facts";
import type { TailoredResume } from "../schemas/tailored-resume";

export type FabricationCheckResult = {
  ok: boolean;
  offending: string[];
};

/**
 * Ensure every bullet in the tailored resume references an existing
 * {experienceId, sourceBulletIndex} pair in the source idMap. The
 * schema already requires both fields; this enforces that the values
 * correspond to real data.
 */
export function validateFabrication(
  tailored: TailoredResume,
  idMap: CandidateIdMap,
): FabricationCheckResult {
  const offending: string[] = [];

  for (const exp of tailored.experiences) {
    const known = idMap.experiences[exp.experienceId];
    if (!known) {
      offending.push(`experienceId:${exp.experienceId}`);
      continue;
    }
    for (const bullet of exp.bullets) {
      if (bullet.experienceId !== exp.experienceId) {
        offending.push(
          `bullet.experienceId:${bullet.experienceId} (under ${exp.experienceId})`,
        );
      }
      if (
        bullet.sourceBulletIndex < 0 ||
        bullet.sourceBulletIndex >= known.bullets.length
      ) {
        offending.push(
          `${exp.experienceId}.sourceBulletIndex:${bullet.sourceBulletIndex}`,
        );
      }
    }
  }

  return { ok: offending.length === 0, offending };
}
