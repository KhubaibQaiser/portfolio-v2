import { Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as lambda from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import type { InfraConfig } from "./config";

/**
 * SSM Parameter Store is the cross-stack discovery registry. Producers publish
 * physical names/ids here; consumers read them by these stable logical paths.
 *
 * This deliberately replaces CloudFormation cross-stack exports, which deadlock
 * ("Cannot update export … as it is in use") whenever a producer resource is
 * replaced. The SSM paths are the contract between stacks — physical resource
 * names are free to change (or be auto-generated), and a future migration just
 * repoints the parameter. See docs/adr/0001-cross-stack-references.md.
 */
export function ssmPaths(config: InfraConfig) {
  const base = `/${config.appName.toLowerCase()}`;
  return {
    /** Physical name of the (auto-named) media bucket. */
    mediaBucketName: `${base}/data/media-bucket-name`,
    /** Public HTTPS base URL for media objects (CloudFront in front of the bucket). */
    mediaPublicBaseUrl: `${base}/data/media-public-base-url`,
    /** Complete ARN of the Google OAuth JSON secret (Auth stack). */
    googleOAuthArn: `${base}/auth/google-oauth-arn`,
    /** Complete ARN of the Better Auth signing secret (Auth stack). */
    betterAuthSecretArn: `${base}/auth/better-auth-secret-arn`,
    /** Route 53 public hosted zone id (from the Dns stack). */
    hostedZoneId: `${base}/dns/hosted-zone-id`,
    /** us-east-1 ACM certificate ARN for CloudFront (from the Cert stack). */
    certificateArn: `${base}/dns/certificate-arn`,
    /** Complete ARNs (incl. random suffix) of the CDK-owned AI key secrets. */
    groqApiKeyArn: `${base}/ai/groq-api-key-arn`,
    anthropicApiKeyArn: `${base}/ai/anthropic-api-key-arn`,
  } as const;
}

/** Secrets Manager secret names (values injected out-of-band or auto-generated). */
export function secretNames(config: InfraConfig) {
  const base = `/${config.appName.toLowerCase()}`;
  return {
    groqApiKey: `${base}/groq-api-key`,
    anthropicApiKey: `${base}/anthropic-api-key`,
    googleOAuth: `${base}/google-oauth`,
    betterAuthSecret: `${base}/better-auth-secret`,
  } as const;
}

/**
 * Shared definition of the application-error metric. The app stacks publish to
 * it via a Logs metric filter (one per app, no dimensions, so both apps roll up
 * into a single time series); the SharedStack alarms on it by namespace/name.
 * Referencing by name (not a construct/export) keeps the stacks decoupled — see
 * docs/adr/0001-cross-stack-references.md — and a single one-metric alarm is far
 * cheaper than per-resource metric-math alarms (docs/adr/0002-cost-optimization.md).
 */
export function appErrorMetric(config: InfraConfig) {
  return {
    namespace: `${config.appName}/Observability`,
    metricName: "AppErrors",
  } as const;
}

/**
 * Deterministic DynamoDB ARNs for the whole table set. Table names follow the
 * `${tablePrefix}-<suffix>` convention (the prefix is a versionable knob), so a
 * consumer grants the entire set with one wildcard instead of importing the
 * table constructs across stacks.
 */
export function tableArnPatterns(scope: Construct, config: InfraConfig): string[] {
  const { account, region } = Stack.of(scope);
  const base = `arn:aws:dynamodb:${region}:${account}:table/${config.tablePrefix}-`;
  return [`${base}*`, `${base}*/index/*`];
}

/**
 * Grants an app server function read/write to the content tables (by ARN
 * pattern) and the media bucket (by discovered name) — no imported constructs,
 * so the app stacks stay decoupled from the DataStack.
 */
export function grantAppDataAccess(
  scope: Construct,
  fn: lambda.Function,
  config: InfraConfig,
  mediaBucketName: string,
): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "DynamoContentAccess",
      actions: [
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:ConditionCheckItem",
        "dynamodb:DescribeTable",
      ],
      resources: tableArnPatterns(scope, config),
    }),
  );

  const bucketArn = `arn:aws:s3:::${mediaBucketName}`;
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "MediaObjectAccess",
      actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      resources: [`${bucketArn}/*`],
    }),
  );
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "MediaListBucket",
      actions: ["s3:ListBucket"],
      resources: [bucketArn],
    }),
  );
}
