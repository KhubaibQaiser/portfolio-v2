import { cache } from "react";
import { getContentRepository } from "@portfolio/data";

// ---------------------------------------------------------------------------
// All data is loaded through the content repository port (fixtures by default,
// DynamoDB when DATA_BACKEND=dynamo). React cache() deduplicates within a
// request; page-level `export const revalidate = 3600` owns cross-request ISR.
// ---------------------------------------------------------------------------

const repo = getContentRepository();

export const fetchHero = cache(async () => repo.getHero());
export const fetchAbout = cache(async () => repo.getAbout());
export const fetchExperience = cache(async () => repo.getExperience());
export const fetchFeaturedProjects = cache(async () => repo.getFeaturedProjects());
export const fetchAllProjects = cache(async () => repo.getProjects());
export const fetchProjectBySlug = cache(async (slug: string) =>
  repo.getProjectBySlug(slug),
);
export const fetchSkills = cache(async () => repo.getSkills());
export const fetchTestimonials = cache(async () => repo.getTestimonials());
export const fetchSiteConfig = cache(async () => repo.getSiteConfig());
