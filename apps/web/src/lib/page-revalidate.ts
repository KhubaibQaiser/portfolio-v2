/**
 * ISR freshness for every public page. CMS writes show up on the next
 * regeneration; deploys still invalidate CloudFront `/*` immediately.
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
