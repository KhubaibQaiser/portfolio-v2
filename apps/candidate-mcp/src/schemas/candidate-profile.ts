import { z } from "zod";
import { aboutSchema } from "@portfolio/shared/schemas/about";
import { resumeSchema } from "@portfolio/shared/schemas/resume";
import { experienceSchema } from "@portfolio/shared/schemas/experience";
import { skillSchema } from "@portfolio/shared/schemas/skill";
import { siteConfigSchema } from "@portfolio/shared/schemas/site-config";
import { projectSchema } from "@portfolio/shared/schemas/project";
import { testimonialSchema } from "@portfolio/shared/schemas/testimonial";

/**
 * The `get_candidate_profile` tool's output contract, reusing the same Zod
 * "form data" schemas the CMS validates writes against (they already omit
 * internal bookkeeping fields — `id`, `created_at`, `revision`) rather than
 * hand-duplicating field lists. Single-sourcing this way means a schema
 * change in `packages/shared` is caught here — and in any test asserting
 * against this shape — instead of silently drifting.
 *
 * Scope matches ADR 0003's decision: everything already public on
 * `khubaibqaiser.com` (site info, about, resume, experience, skills,
 * projects, testimonials) and nothing else — no admin-only or draft content.
 */
export const candidateProfileSchema = z.object({
  site: siteConfigSchema,
  about: aboutSchema,
  resume: resumeSchema,
  experience: z.array(experienceSchema),
  skills: z.array(skillSchema),
  projects: z.array(projectSchema),
  testimonials: z.array(testimonialSchema),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
