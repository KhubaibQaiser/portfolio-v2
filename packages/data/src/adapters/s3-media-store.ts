import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { MediaStore, StoredMediaObject } from "@portfolio/shared/ports";
import { buildObjectKey, isAllowedImageMime, safeObjectFilename } from "../media/keys";

const DEFAULT_PRESIGN_EXPIRY_SECONDS = 300;

export type S3MediaStoreConfig = {
  client: S3Client;
  bucket: string;
  /** Public CDN base (CloudFront) that fronts the bucket, e.g. https://cdn.example.com */
  publicBaseUrl: string;
};

/**
 * S3-backed {@link MediaStore}. Objects are served through a CloudFront public
 * base URL; uploads can be proxied (`uploadObject`) or done directly from the
 * browser via a short-lived presigned PUT.
 */
export function createS3MediaStore(config: S3MediaStoreConfig): MediaStore {
  const { client, bucket } = config;
  const base = config.publicBaseUrl.replace(/\/$/, "");

  return {
    isConfigured() {
      return true;
    },

    safeObjectFilename,
    buildObjectKey,
    isAllowedImageMime,

    buildPublicObjectUrl(objectKey: string) {
      return `${base}/${objectKey}`;
    },

    publicUrlToObjectKey(publicUrl: string) {
      if (!publicUrl.startsWith(`${base}/`)) return null;
      return decodeURIComponent(publicUrl.slice(base.length + 1));
    },

    async uploadObject(
      body: Uint8Array,
      objectKey: string,
      contentType: string,
      metadata?: Record<string, string>,
    ) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentType: contentType,
          Metadata: metadata,
        }),
      );
    },

    async getObject(objectKey: string): Promise<StoredMediaObject | null> {
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        const body = await result.Body?.transformToByteArray();
        if (!body) return null;
        return {
          body,
          contentType: result.ContentType,
          metadata: result.Metadata,
        };
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        if (error instanceof Error && error.name === "NotFound") return null;
        throw error;
      }
    },

    async deleteObject(objectKey: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    },

    async createPresignedPutUrl(
      objectKey: string,
      contentType: string,
      expiresInSeconds = DEFAULT_PRESIGN_EXPIRY_SECONDS,
    ) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    },
  };
}
