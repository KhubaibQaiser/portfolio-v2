import { revalidatePath, revalidateTag } from "next/cache";
import { WEB_CONTENT_PATHS } from "@portfolio/shared/constants";
import { invalidateCloudFrontPaths } from "@/lib/invalidate-cloudfront";
import { logger } from "@/lib/logger";

export type RevalidateContentInput = {
  tags?: string[];
  paths?: string[];
};

export type RevalidateContentResult =
  | {
      success: true;
      revalidated: { tags: string[]; paths: string[] };
      cloudFrontInvalidationId?: string;
    }
  | { success: false; error: string };

function uniquePaths(...groups: (readonly string[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const p of group) {
      set.add(p.startsWith("/") ? p : `/${p}`);
    }
  }
  return [...set];
}

/**
 * Orchestrates on-demand cache refresh: Next.js tag/path revalidation (OpenNext
 * ISR + SQS) and CloudFront edge invalidation for public routes.
 */
export async function revalidateContentCache(
  input: RevalidateContentInput,
): Promise<RevalidateContentResult> {
  const tags = input.tags ?? [];
  const paths = uniquePaths(WEB_CONTENT_PATHS, input.paths);

  if (tags.length === 0 && paths.length === 0) {
    return { success: false, error: "Provide at least one tag or path" };
  }

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  // Page-scoped revalidation only — layout revalidation touches internal routes
  // like /_not-found and fails on Lambda's read-only filesystem.
  for (const path of paths) {
    revalidatePath(path, "page");
  }

  let cloudFrontInvalidationId: string | undefined;
  if (process.env.CLOUDFRONT_DISTRIBUTION_ID) {
    const cf = await invalidateCloudFrontPaths(paths);
    if (!cf.ok) {
      logger.error("cloudfront invalidation failed", {
        paths,
        error: cf.error,
      });
      return { success: false, error: cf.error };
    }
    cloudFrontInvalidationId = cf.invalidationId;
  } else {
    logger.info("skipping cloudfront invalidation (no distribution id)", { paths });
  }

  logger.info("content cache revalidated", {
    tags,
    paths,
    cloudFrontInvalidationId,
  });

  return {
    success: true,
    revalidated: { tags, paths },
    cloudFrontInvalidationId,
  };
}
