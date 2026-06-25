import type { MediaStore } from "@portfolio/shared/ports";
import { createS3MediaStore } from "./adapters/s3-media-store";
import { createNoopMediaStore } from "./adapters/noop-media-store";
import { createS3Client } from "./s3/client";

export { createS3MediaStore } from "./adapters/s3-media-store";
export { createNoopMediaStore } from "./adapters/noop-media-store";
export { createS3Client } from "./s3/client";

/**
 * Returns the media store: S3 when `S3_MEDIA_BUCKET` and `MEDIA_PUBLIC_BASE_URL`
 * are configured, otherwise a no-op store that keeps uploads disabled in dev.
 *
 * This lives in its own entry point (`@portfolio/data/media`) rather than the
 * package barrel so that content-only pages don't pull the AWS S3 SDK into
 * their server bundle. Importing it from the barrel dragged `@aws-sdk/client-s3`
 * (and its subpath deps) into every page, which broke OpenNext/NFT tracing in
 * the Lambda bundle.
 */
export function getMediaStore(): MediaStore {
  const bucket = process.env.S3_MEDIA_BUCKET;
  const publicBaseUrl = process.env.MEDIA_PUBLIC_BASE_URL;
  if (bucket && publicBaseUrl) {
    return createS3MediaStore({
      client: createS3Client(),
      bucket,
      publicBaseUrl,
    });
  }
  return createNoopMediaStore();
}
