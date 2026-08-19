import type { MediaStore } from "@portfolio/shared/ports";
import { buildObjectKey, isAllowedImageMime, safeObjectFilename } from "../media/keys";

const NOT_CONFIGURED =
  "Media store is not configured. Set S3_MEDIA_BUCKET and MEDIA_PUBLIC_BASE_URL to enable uploads.";

/**
 * Dev/no-op {@link MediaStore}. Reports itself as unconfigured so the upload UI
 * stays disabled, and throws loudly if a write is attempted anyway (never a
 * silent success).
 */
export function createNoopMediaStore(): MediaStore {
  return {
    isConfigured() {
      return false;
    },

    safeObjectFilename,
    buildObjectKey,
    isAllowedImageMime,

    buildPublicObjectUrl(objectKey: string) {
      return `/${objectKey}`;
    },

    publicUrlToObjectKey(publicUrl: string) {
      return publicUrl.startsWith("/") ? publicUrl.slice(1) : null;
    },

    async uploadObject() {
      throw new Error(NOT_CONFIGURED);
    },

    async getObject() {
      return null;
    },

    async deleteObject() {
      throw new Error(NOT_CONFIGURED);
    },

    async createPresignedPutUrl() {
      throw new Error(NOT_CONFIGURED);
    },
  };
}
