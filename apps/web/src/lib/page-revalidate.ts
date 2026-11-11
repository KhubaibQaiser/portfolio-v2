/**
 * ISR backstop for every public page. CMS saves purge the ISR cache and
 * CloudFront on demand (ADR 0008); this window only matters if that purge is
 * lost. Deploys also invalidate CloudFront `/*`.
 *
 * Page `export const revalidate` must be this value as a numeric literal.
 * Next.js extracts segment config statically and rejects an imported binding.
 */
export const PAGE_REVALIDATE_SECONDS = 48 * 60 * 60;

/**
 * Shared-cache grace after `revalidate`. Next.js emits
 * `stale-while-revalidate=<expireTime - revalidate>`, and drops that
 * directive when `expireTime` is not greater than `revalidate`.
 * Kept short so a missed invalidation cannot keep year-old HTML.
 */
export const PAGE_STALE_WHILE_REVALIDATE_SECONDS = 50;

export const PAGE_EXPIRE_TIME_SECONDS =
  PAGE_REVALIDATE_SECONDS + PAGE_STALE_WHILE_REVALIDATE_SECONDS;
