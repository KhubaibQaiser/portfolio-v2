import { z } from "zod";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import { candidateProfileSchema, type CandidateProfile } from "../schemas/candidate-profile";
import { deepSanitize } from "../sanitize";
import { withGuardrails } from "../tool-wrapper";
import type { Config } from "../config";

/**
 * Loads every publicly-visible content section and assembles the
 * `get_candidate_profile` tool's response. Pure data-fetch + shape — no HTTP,
 * no auth — so it is directly unit-testable against a fixture repository.
 */
export async function fetchCandidateProfile(repo: ContentRepository): Promise<CandidateProfile> {
  const [site, about, resume, experience, skills, projects, testimonials] = await Promise.all([
    repo.getSiteConfig(),
    repo.getAbout(),
    repo.getResume(),
    repo.getExperience(),
    repo.getSkills(),
    repo.getProjects(),
    repo.getTestimonials(),
  ]);

  const profile: CandidateProfile = {
    site,
    about,
    resume,
    experience,
    skills,
    projects,
    testimonials,
  };

  // Validate before sanitizing so a shape drift fails loudly (schema test),
  // then sanitize free-text fields before this ever reaches a calling agent.
  return deepSanitize(candidateProfileSchema.parse(profile));
}

export function registerGetCandidateProfileTool(
  server: McpServer,
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  config: Pick<Config, "rateLimitMax" | "rateLimitWindowSec">,
): void {
  server.registerTool(
    "get_candidate_profile",
    {
      description:
        "Read the candidate's full public profile: site info, about, resume, work experience, skills, projects, and testimonials. Same content published on khubaibqaiser.com. Read-only.",
      inputSchema: z.object({}),
    },
    withGuardrails("get_candidate_profile", authInfo, config, async () => {
      const profile = await fetchCandidateProfile(repo);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(profile) }],
      };
    }),
  );
}
