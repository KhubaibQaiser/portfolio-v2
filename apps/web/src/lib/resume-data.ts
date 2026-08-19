import { unstable_cache as cache } from "next/cache";
import { getContentRepository } from "@portfolio/data";
import {
  getResumeData as sharedGetResumeData,
  type ResumeData,
} from "@portfolio/shared/resume-data";
import { resolveWebsiteHost } from "./resume-pdf-cache";

export type { ResumeData } from "@portfolio/shared/resume-data";

/**
 * Cached resume payload used by the public PDF + /resume page.
 * Uses the shared loader so the admin app can call it directly (uncached).
 */
export const getResumeData = cache(
  async (): Promise<ResumeData> =>
    sharedGetResumeData(getContentRepository(), { websiteHost: resolveWebsiteHost() }),
  ["resume-data"],
  { revalidate: 10 },
);
