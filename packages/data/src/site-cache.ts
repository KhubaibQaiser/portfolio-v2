import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { S3Client } from "@aws-sdk/client-s3";
import type { SiteCachePurger } from "@portfolio/shared/ports";
import { createAwsSiteCachePurger } from "./adapters/aws-site-cache-purger";

export { createAwsSiteCachePurger } from "./adapters/aws-site-cache-purger";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Builds the purger from the env the web stack sets on the purge Lambda. */
export function createSiteCachePurgerFromEnv(): SiteCachePurger {
  const region = process.env.AWS_REGION ?? "eu-west-1";
  return createAwsSiteCachePurger({
    s3: new S3Client({ region }),
    // CloudFront is a global API served from us-east-1.
    cloudfront: new CloudFrontClient({ region: "us-east-1" }),
    bucket: requireEnv("CACHE_BUCKET_NAME"),
    cachePrefix: requireEnv("CACHE_BUCKET_KEY_PREFIX"),
    distributionId: requireEnv("DISTRIBUTION_ID"),
  });
}
