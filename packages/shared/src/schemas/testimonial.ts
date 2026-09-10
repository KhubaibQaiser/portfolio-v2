import { z } from "zod";

export const testimonialSchema = z.object({
  full_name: z.string(),
  profile_url: z.string(),
  role_title: z.string(),
  recommended_at: z.string(),
  description: z.string(),
  linkedin_url: z.string(),
  avatar_url: z
    .string()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null))
    .default(null),
});

export type TestimonialFormData = z.infer<typeof testimonialSchema>;

export const testimonialRowSchema = testimonialSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().int().min(1).default(1),
});

export type Testimonial = z.infer<typeof testimonialRowSchema>;

const LINKEDIN_RECOMMENDATIONS_SUFFIX =
  "/details/recommendations/?detailScreenTabIndex=0";

/**
 * Builds the LinkedIn "recommendations" verify URL from a profile URL
 * (`https://linkedin.com/in/<handle>` or `www.` / trailing slash variants).
 * Returns empty string when no usable profile URL is provided.
 * Avoids DOM `URL` — shared pkg is ES-only.
 */
export function linkedInRecommendationsUrlFromProfile(
  profileUrl: string | null | undefined,
): string {
  const raw = profileUrl?.trim();
  if (!raw) return "";
  const match = raw.match(/^https?:\/\/(?:www\.)?linkedin\.com\/in\/([^/?#]+)\/?/i);
  if (!match?.[1]) return "";
  return `https://www.linkedin.com/in/${match[1]}${LINKEDIN_RECOMMENDATIONS_SUFFIX}`;
}

/** @deprecated Prefer {@link linkedInRecommendationsUrlFromProfile} with SiteConfig. */
export const DEFAULT_LINKEDIN_RECOMMENDATIONS_URL = "";

/** Card preview length on the public site; seed recommendations are ~186–208 chars. */
export const RECOMMENDATION_DESCRIPTION_PREVIEW_MAX = 300;

/** Maximum recommendation cards shown on the home page (newest first). */
export const RECOMMENDATIONS_SECTION_MAX = 6;

export function truncateRecommendationDescription(
  text: string,
  max = RECOMMENDATION_DESCRIPTION_PREVIEW_MAX,
): { preview: string; isTruncated: boolean } {
  if (text.length <= max) {
    return { preview: text, isTruncated: false };
  }

  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const preview =
    lastSpace > max * 0.6 ? slice.slice(0, lastSpace).trimEnd() : slice.trimEnd();

  return { preview, isTruncated: true };
}
