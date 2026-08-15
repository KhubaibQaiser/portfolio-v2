import { createHash } from "node:crypto";

import type { CandidateFacts } from "@portfolio/ai/context/build-candidate-facts";
import type {
  ResumeGenerationSourceSnapshot,
  VariantGuidelines,
} from "@portfolio/shared/schemas";

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createGenerationSnapshot(
  facts: CandidateFacts,
  guidelines: VariantGuidelines,
  layoutVersion: number,
): ResumeGenerationSourceSnapshot {
  const experience = Object.values(facts.idMap.experiences)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => ({
      id: item.id,
      bulletHashes: item.bullets.map((bullet) => hash(bullet)),
    }));
  const skills = Object.values(facts.idMap.skills)
    .map((skill) => skill.name)
    .sort((left, right) => left.localeCompare(right));

  return {
    sourceHash: hash({
      factSheetHash: hash(facts.factSheet),
      experience,
      skills,
    }),
    guidelineHash: hash(guidelines),
    layoutVersion,
    experience,
    skills,
  };
}
