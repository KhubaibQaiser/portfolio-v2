import { unstable_cache as cache } from "next/cache";
import { getContentRepository } from "@portfolio/data";
import {
  getResumeData as sharedGetResumeData,
  type ResumeData,
} from "@portfolio/shared/resume-data";

export type { ResumeData } from "@portfolio/shared/resume-data";

const websiteHost = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://khubaibqaiser.com"
).replace(/^https?:\/\//, "");

/**
 * Cached resume payload used by the public PDF + /resume page.
 * Uses the shared loader so the admin app can call it directly (uncached).
 */
export const getResumeData = cache(
  async (): Promise<ResumeData> =>
    sharedGetResumeData(getContentRepository(), { websiteHost }),
  ["resume-data"],
  { revalidate: 3600 },
);
