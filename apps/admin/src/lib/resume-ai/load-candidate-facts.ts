import { unstable_cache } from "next/cache";
import { getContentRepository } from "@portfolio/data";
import {
  buildCandidateFacts,
  type CandidateFacts,
  type FactsInputSiteConfig,
} from "@portfolio/ai/context/build-candidate-facts";

/**
 * Load all rows the fact-sheet builder needs in parallel and hand them
 * to the pure `buildCandidateFacts` function.
 *
 * Candidate data is global (not per-user), so this is safe to memoize
 * with `unstable_cache` keyed only by the cache key. Refreshes on the
 * public site's 1-hour ISR window after admin edits.
 */
export async function loadCandidateFactsUncached(): Promise<CandidateFacts> {
  const repo = getContentRepository();
  const [siteConfig, resume, experience, skills, about] = await Promise.all([
    repo.getSiteConfig(),
    repo.getResume(),
    repo.getExperience(),
    repo.getSkills(),
    repo.getAbout().catch(() => null),
  ]);

  const mappedSiteConfig: FactsInputSiteConfig = {
    name: siteConfig.name,
    title: siteConfig.title,
    email: siteConfig.email,
    location: siteConfig.location,
    social_links:
      (siteConfig.social_links as unknown as Array<{
        platform: string;
        url: string;
        label?: string;
      }>) ?? [],
  };

  return buildCandidateFacts({
    siteConfig: mappedSiteConfig,
    resume: {
      default_summary: resume.default_summary,
      education:
        (resume.education as unknown as Array<{
          degree: string;
          institution: string;
          year: string;
        }>) ?? [],
      certifications:
        (resume.certifications as unknown as Array<{
          name: string;
          issuer: string;
        }>) ?? [],
      voice_sample: resume.voice_sample ?? null,
    },
    experiences: experience.map((e) => ({
      id: e.id,
      company: e.company,
      role: e.role,
      location: e.location,
      location_type: e.location_type,
      contract_type: e.contract_type,
      start_date: e.start_date,
      end_date: e.end_date,
      description: e.description,
      tech_tags: e.tech_tags,
    })),
    skills: skills.map((s) => ({ category: s.category, name: s.name })),
    about: about
      ? {
          years_experience: about.years_experience,
          industries: about.industries,
        }
      : undefined,
  });
}

/**
 * Cached fact-sheet loader. Keyed statically because candidate data is global.
 */
export const loadCandidateFacts = unstable_cache(
  async (): Promise<CandidateFacts> => loadCandidateFactsUncached(),
  ["resume-ai:candidate-facts"],
  { revalidate: 3600 },
);
