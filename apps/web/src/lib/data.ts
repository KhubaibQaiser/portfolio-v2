import { unstable_cache as cache } from "next/cache";
import { getContentRepository } from "@portfolio/data";

// ---------------------------------------------------------------------------
// All data is loaded through the content repository port (fixtures by default,
// DynamoDB when DATA_BACKEND=dynamo). These are unstable_cache wrappers keyed
// by tag; the admin app calls POST /api/revalidate (revalidateTag +
// revalidatePath layout) so updates appear immediately.
// ---------------------------------------------------------------------------

const repo = getContentRepository();

export const fetchHero = cache(async () => repo.getHero(), ["hero"], {
  tags: ["hero"],
});

export const fetchAbout = cache(async () => repo.getAbout(), ["about"], {
  tags: ["about"],
});

export const fetchExperience = cache(async () => repo.getExperience(), ["experience"], {
  tags: ["experience"],
});

export const fetchFeaturedProjects = cache(
  async () => repo.getFeaturedProjects(),
  ["featured-projects"],
  { tags: ["projects"] },
);

export const fetchAllProjects = cache(async () => repo.getProjects(), ["all-projects"], {
  tags: ["projects"],
});

export const fetchSkills = cache(async () => repo.getSkills(), ["skills"], {
  tags: ["skills"],
});

export const fetchTestimonials = cache(
  async () => repo.getTestimonials(),
  ["testimonials"],
  { tags: ["testimonials"] },
);

export const fetchSiteConfig = cache(async () => repo.getSiteConfig(), ["site-config"], {
  tags: ["site-config"],
});

export const fetchResume = cache(async () => repo.getResume(), ["resume"], {
  tags: ["resume"],
});
