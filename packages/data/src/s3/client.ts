import { S3Client } from "@aws-sdk/client-s3";

/**
 * Builds an S3 client. When `S3_ENDPOINT` is set (e.g. MinIO/LocalStack for
 * local dev) the client targets it with path-style addressing; otherwise it
 * uses the ambient AWS credentials/region (Lambda execution role in prod).
 */
export function createS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.AWS_REGION ?? "us-east-1";

  return new S3Client({
    region,
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId: "local", secretAccessKey: "local" },
        }
      : {}),
  });
}
