import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

export type CloudFrontInvalidationResult =
  | { ok: true; invalidationId: string }
  | { ok: false; error: string };

/** Creates a CloudFront invalidation for the given viewer paths. */
export async function invalidateCloudFrontPaths(
  paths: readonly string[],
): Promise<CloudFrontInvalidationResult> {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) {
    return { ok: false, error: "CLOUDFRONT_DISTRIBUTION_ID is not configured" };
  }

  const items = [...new Set(paths.map((p) => (p.startsWith("/") ? p : `/${p}`)))];
  if (items.length === 0) {
    return { ok: false, error: "No paths to invalidate" };
  }

  const client = new CloudFrontClient({});
  const response = await client.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `${Date.now()}-${crypto.randomUUID()}`,
        Paths: { Quantity: items.length, Items: items },
      },
    }),
  );

  const invalidationId = response.Invalidation?.Id;
  if (!invalidationId) {
    return { ok: false, error: "CloudFront did not return an invalidation id" };
  }

  return { ok: true, invalidationId };
}
