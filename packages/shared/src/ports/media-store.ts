export type StoredMediaObject = {
  body: Uint8Array;
  contentType?: string;
  /** Arbitrary metadata stored alongside the object (e.g. a content hash). */
  metadata?: Record<string, string>;
};

/**
 * Backend-agnostic object storage for media assets. Implemented by S3 in
 * production and by a local disk/no-op adapter in dev. Key derivation and URL
 * mapping live here so the admin upload flow never hard-codes a provider.
 */
export type MediaStore = {
  /** True when the store has the credentials/config needed to operate. */
  isConfigured(): boolean;

  /** Sanitizes an uploaded filename into a safe, URL-friendly form. */
  safeObjectFilename(originalName: string): string;

  /** Builds a unique object key (path) for a freshly uploaded file. */
  buildObjectKey(originalFilename: string): string;

  /** Maps a stored object key to its public (CDN) URL. */
  buildPublicObjectUrl(objectKey: string): string;

  /** Reverses {@link buildPublicObjectUrl}; null when the URL is foreign. */
  publicUrlToObjectKey(publicUrl: string): string | null;

  /** Whether the given MIME type is an accepted image type. */
  isAllowedImageMime(type: string): boolean;

  /** Uploads bytes server-side (used when proxying through the app). */
  uploadObject(
    body: Uint8Array,
    objectKey: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void>;

  /** Reads an object by key. Returns null when it doesn't exist. */
  getObject(objectKey: string): Promise<StoredMediaObject | null>;

  /** Deletes an object by key. */
  deleteObject(objectKey: string): Promise<void>;

  /**
   * Issues a short-lived presigned URL so the browser can PUT bytes directly,
   * keeping large uploads off the application server.
   */
  createPresignedPutUrl(
    objectKey: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<string>;
};
