import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

export function assertR2Configured(): void {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.",
    );
  }
}

function getS3(): { client: S3Client; bucket: string } {
  assertR2Configured();
  const accountId = process.env.R2_ACCOUNT_ID!;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return { client, bucket: process.env.R2_BUCKET_NAME! };
}

export function buildPublicObjectUrl(objectKey: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "");
  return `${base}/${objectKey}`;
}

/** Maps a stored public URL back to the R2 object key, if it matches this deployment's public base. */
export function publicUrlToObjectKey(publicUrl: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base || !publicUrl.startsWith(`${base}/`)) return null;
  return decodeURIComponent(publicUrl.slice(base.length + 1));
}

export function safeObjectFilename(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "file";
}

export function buildObjectKey(originalFilename: string): string {
  const safe = safeObjectFilename(originalFilename);
  return `media/${crypto.randomUUID()}-${safe}`;
}

export function isAllowedImageMime(type: string): boolean {
  return ALLOWED_UPLOAD_TYPES.has(type);
}

export async function uploadObjectToR2(
  body: Buffer,
  objectKey: string,
  contentType: string,
): Promise<void> {
  const { client, bucket } = getS3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObjectFromR2(objectKey: string): Promise<void> {
  const { client, bucket } = getS3();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}
