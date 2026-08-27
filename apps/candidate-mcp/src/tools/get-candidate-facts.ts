import { z } from "zod";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import {
  buildCandidateFacts,
  type CandidateFacts,
} from "@portfolio/ai/context/build-candidate-facts";
import { deepSanitize } from "../sanitize";
import { withGuardrails } from "../tool-wrapper";
import type { ClientRateLimit } from "../config";

/**
 * Assembles the same compact "fact sheet" the resume-AI pipeline feeds its
 * models (`packages/ai/src/context/build-candidate-facts.ts`) — a denser,
 * LLM-optimized alternative to `get_candidate_profile`'s full JSON, useful
 * for an automation that wants candidate context in prompt-ready form (e.g.
 * a job-matching or resume-tailoring workflow, the roadmap's Phase 2).
 *
 * Reuses the exact same builder the admin app's resume generator calls, so
 * this server can never describe the candidate differently than the AI
 * pipeline that writes their resume.
 */
export async function fetchCandidateFacts(
  repo: ContentRepository,
): Promise<CandidateFacts> {
  const [siteConfig, resume, experiences, skills, about] = await Promise.all([
    repo.getSiteConfig(),
    repo.getResume(),
    repo.getExperience(),
    repo.getSkills(),
    repo.getAbout(),
  ]);

  const facts = buildCandidateFacts({
    siteConfig,
    resume,
    experiences,
    skills,
    about: { years_experience: about.years_experience, industries: about.industries },
  });

  return deepSanitize(facts);
}

export function registerGetCandidateFactsTool(
  server: McpServer,
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  config: ClientRateLimit,
): void {
  server.registerTool(
    "get_candidate_facts",
    {
      description:
        "Read a compact, LLM-ready fact sheet summarizing the candidate's experience, skills, education, and voice sample. The same context the resume-AI pipeline uses. Read-only.",
      inputSchema: z.object({}),
    },
    withGuardrails("get_candidate_facts", authInfo, config, async () => {
      const facts = await fetchCandidateFacts(repo);
      return {
        content: [{ type: "text" as const, text: facts.factSheet }],
      };
    }),
  );
}
