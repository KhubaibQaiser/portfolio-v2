/**
 * Stable SSM Parameter Store paths — the cross-stack discovery contract.
 * Producers (CDK stacks) publish here; deploy scripts and consumers read by
 * these logical paths. See docs/adr/0001-cross-stack-references.md.
 */
export const DEFAULT_APP_NAME = "Portfolio";

export function ssmPaths(appName: string = DEFAULT_APP_NAME) {
  const base = `/${appName.toLowerCase()}`;
  return {
    /** Physical name of the (auto-named) media bucket. */
    mediaBucketName: `${base}/data/media-bucket-name`,
    /** Public HTTPS base URL for media objects (CloudFront in front of the bucket). */
    mediaPublicBaseUrl: `${base}/data/media-public-base-url`,
    /** Complete ARN of the Google OAuth JSON secret (Auth stack). */
    googleOAuthArn: `${base}/auth/google-oauth-arn`,
    /** Complete ARN of the Better Auth signing secret (Auth stack). */
    betterAuthSecretArn: `${base}/auth/better-auth-secret-arn`,
    /** Complete ARNs (incl. random suffix) of the CDK-owned AI key secrets. */
    groqApiKeyArn: `${base}/ai/groq-api-key-arn`,
    anthropicApiKeyArn: `${base}/ai/anthropic-api-key-arn`,
  } as const;
}

export type SsmPaths = ReturnType<typeof ssmPaths>;
