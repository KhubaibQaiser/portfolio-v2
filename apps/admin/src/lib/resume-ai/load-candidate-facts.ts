import { unstable_cache } from "next/cache";
import type { CandidateFacts } from "@portfolio/ai/context/build-candidate-facts";
import { loadCandidateFactsUncached } from "./load-candidate-facts-uncached";

export { loadCandidateFactsUncached } from "./load-candidate-facts-uncached";

/**
 * Cached fact-sheet loader for the Next.js admin server. Keyed statically
 * because candidate data is global. Do not import this module from CDK
 * NodejsFunction workers — `next/cache` throws outside the App Router.
 */
export const loadCandidateFacts = unstable_cache(
  async (): Promise<CandidateFacts> => loadCandidateFactsUncached(),
  ["resume-ai:candidate-facts"],
  { revalidate: 10 },
);
