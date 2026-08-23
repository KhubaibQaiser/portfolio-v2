import { createHash } from "node:crypto";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { ResumeLayout } from "@portfolio/shared/schemas";

/**
 * Fixed object key for the public canonical resume PDF cache in the media
 * bucket. Shared between `/api/pdf` (cache read + write-through on miss) and
 * the background rebuild Lambda (keep-warm insurance, see
 * `src/lambda/rebuild-canonical-pdf`) so both sides agree on where the cached
 * PDF lives without a config value to keep in sync.
 */
export const CANONICAL_RESUME_PDF_KEY = "system/resume-canonical.pdf";

/** S3 object-metadata key the content hash is stored under. */
export const CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY = "content-hash";

/** ISO timestamp written on each cache write-through. */
export const CANONICAL_RESUME_CACHED_AT_METADATA_KEY = "cached-at";

/** Origin + CDN freshness ceiling for the public PDF. */
export const CANONICAL_RESUME_PDF_TTL_SECONDS = 3600;

export const CANONICAL_RESUME_PDF_CACHE_CONTROL =
  "public, max-age=60, s-maxage=3600, stale-while-revalidate=60";

export function isCanonicalResumeCacheFresh(
  metadata: Record<string, string> | undefined,
  now = Date.now(),
): boolean {
  const cachedAt = metadata?.[CANONICAL_RESUME_CACHED_AT_METADATA_KEY];
  if (!cachedAt) return false;
  const timestamp = Date.parse(cachedAt);
  if (Number.isNaN(timestamp)) return false;
  return now - timestamp <= CANONICAL_RESUME_PDF_TTL_SECONDS * 1000;
}

/**
 * The website host shown on the resume PDF header. Kept here (rather than
 * inline in resume-data.ts) so the rebuild Lambda — which can't use Next's
 * `unstable_cache` outside a request context — computes the exact same value
 * the live route does; a mismatch here would make every rebuild sweep see a
 * spurious content-hash miss and re-render for no reason.
 */
export function resolveWebsiteHost(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://khubaibqaiser.com").replace(
    /^https?:\/\//,
    "",
  );
}

/**
 * Deterministic hash of everything that can change what the canonical
 * `/api/pdf` renders: the resume content and the layout guidelines/version
 * used to render it. Comparing this against the hash recorded on a cached
 * object is how both the request-time route and the rebuild Lambda decide
 * whether the cache is still valid, without re-rendering to find out.
 */
export function hashCanonicalResumeContent(
  data: ResumeData,
  layout: ResumeLayout | null,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        data,
        layoutId: layout?.id ?? null,
        layoutComponentKey: layout?.component_key ?? null,
        layoutVersion: layout?.version ?? null,
        // Layout guidelines (typography, spacing, colors, ...) can change
        // without a version bump — e.g. an admin edit to an existing row.
        // Hashing them directly (not just the version) means the cache is
        // never stale relative to what actually renders.
        layoutGuidelines: layout?.guidelines ?? null,
      }),
    )
    .digest("hex");
}
