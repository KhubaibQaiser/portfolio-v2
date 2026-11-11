import {
  CreateInvalidationCommand,
  type CloudFrontClient,
} from "@aws-sdk/client-cloudfront";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type S3Client,
} from "@aws-sdk/client-s3";
import type { SiteCachePurger, SiteCachePurgeResult } from "@portfolio/shared/ports";

export type AwsSiteCachePurgerConfig = {
  s3: S3Client;
  cloudfront: CloudFrontClient;
  bucket: string;
  /** OpenNext incremental-cache prefix (`CACHE_BUCKET_KEY_PREFIX`). */
  cachePrefix: string;
  distributionId: string;
};

/**
 * Deletes the whole OpenNext incremental cache (pages and `unstable_cache`
 * entries) and invalidates CloudFront `/*`. A missing cache object is a clean
 * miss in OpenNext, so the next request renders from DynamoDB. Purging the
 * prefix avoids depending on OpenNext's per-key layout.
 */
export function createAwsSiteCachePurger(
  config: AwsSiteCachePurgerConfig,
): SiteCachePurger {
  const { s3, cloudfront, bucket, distributionId } = config;
  const prefix = `${config.cachePrefix.replace(/\/+$/, "")}/`;

  async function deleteCachePrefix(): Promise<number> {
    let deleted = 0;
    let token: string | undefined;
    do {
      const page = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (keys.length > 0) {
        const result = await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys, Quiet: true },
          }),
        );
        if (result.Errors?.length) {
          throw new Error(
            `Failed to delete ${result.Errors.length} ISR cache object(s): ${result.Errors[0]?.Code ?? "unknown"}`,
          );
        }
        deleted += keys.length;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return deleted;
  }

  return {
    async purgeAll(): Promise<SiteCachePurgeResult> {
      // Origin first, so a CDN miss after invalidation cannot refill from stale S3.
      const deletedObjects = await deleteCachePrefix();
      const invalidation = await cloudfront.send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: `content-${Date.now()}`,
            // One wildcard path counts once toward the 1,000 free paths/month.
            Paths: { Quantity: 1, Items: ["/*"] },
          },
        }),
      );
      return { deletedObjects, invalidationId: invalidation.Invalidation?.Id };
    },
  };
}
