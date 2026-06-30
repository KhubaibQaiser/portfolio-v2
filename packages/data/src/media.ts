import type { MediaStore } from "@portfolio/shared/ports";
import { createNoopMediaStore } from "./adapters/noop-media-store";

export { createS3MediaStore } from "./adapters/s3-media-store";
export { createNoopMediaStore } from "./adapters/noop-media-store";
export { createS3Client } from "./s3/client";

/**
 * Whether S3 media storage env vars are set. Safe to call from SSR pages
 * without loading the AWS S3 SDK.
 */
export function isMediaStorageConfigured(): boolean {
  return Boolean(process.env.S3_MEDIA_BUCKET && process.env.MEDIA_PUBLIC_BASE_URL);
}

let cached: MediaStore | null = null;

/**
 * Returns the media store: S3 when `S3_MEDIA_BUCKET` and `MEDIA_PUBLIC_BASE_URL`
 * are configured, otherwise a no-op store that keeps uploads disabled in dev.
 *
 * S3 adapters are loaded dynamically so pages that only need the configured flag
 * (or the noop store) do not pull `@aws-sdk/client-s3` into the Lambda bundle.
 *
 * This lives in its own entry point (`@portfolio/data/media`) rather than the
 * package barrel so that content-only pages don't pull the AWS S3 SDK into
 * their server bundle.
 */
export async function getMediaStore(): Promise<MediaStore> {
  if (cached) return cached;

  if (!isMediaStorageConfigured()) {
    cached = createNoopMediaStore();
    return cached;
  }

  const [{ createS3MediaStore }, { createS3Client }] = await Promise.all([
    import("./adapters/s3-media-store"),
    import("./s3/client"),
  ]);

  cached = createS3MediaStore({
    client: createS3Client(),
    bucket: process.env.S3_MEDIA_BUCKET!,
    publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL!,
  });
  return cached;
}
