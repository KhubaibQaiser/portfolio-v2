import { unstable_cache as cache } from "next/cache";
import { supabase } from "@/lib/supabase-server";
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
    sharedGetResumeData(supabase, { websiteHost }),
  ["resume-data"],
  { tags: ["resume", "experience", "skills", "site-config"] },
);
