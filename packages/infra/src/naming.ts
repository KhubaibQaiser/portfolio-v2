import { Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as lambda from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import { ssmPaths as deploySsmPaths } from "@portfolio/deploy/ssm-paths";
import { TABLE_SUFFIXES } from "@portfolio/data/tables";
import type { InfraConfig } from "./config";

/**
 * SSM Parameter Store paths for this app's infra config.
 * Logical paths are single-sourced in `@portfolio/deploy/ssm-paths`.
 */
export function ssmPaths(config: InfraConfig) {
  return deploySsmPaths(config.appName);
}

/** Secrets Manager secret names (values injected out-of-band or auto-generated). */
export function secretNames(config: InfraConfig) {
  const base = `/${config.appName.toLowerCase()}`;
  return {
    groqApiKey: `${base}/groq-api-key`,
    anthropicApiKey: `${base}/anthropic-api-key`,
    resendApiKey: `${base}/resend-api-key`,
    turnstileSecretKey: `${base}/turnstile-secret-key`,
    googleOAuth: `${base}/google-oauth`,
    betterAuthSecret: `${base}/better-auth-secret`,
    jobspipeApiKey: `${base}/jobspipe-api-key`,
  } as const;
}

/** Domain-event bus (SharedStack). Consumers find it by name, not export (ADR 0001). */
export function eventBusName(config: InfraConfig): string {
  return `${config.appName}-bus`;
}

/**
 * Lets an admin function publish `ContentChanged` to the shared bus so the web
 * stack purges its ISR + CDN caches (ADR 0008).
 */
export function grantContentChangedPublish(
  scope: Construct,
  fn: lambda.Function,
  config: InfraConfig,
): void {
  const { account, region } = Stack.of(scope);
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "PublishContentChanged",
      actions: ["events:PutEvents"],
      resources: [
        `arn:aws:events:${region}:${account}:event-bus/${eventBusName(config)}`,
      ],
    }),
  );
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
 * App data grants use ARN patterns/discovered names rather than imported
 * constructs, so the app stacks stay decoupled from the DataStack. Web receives
 * only the read/counter access it needs; admin receives CMS write access.
 */
/** Public-site permissions: content reads, ephemeral counters/cache writes, media reads. */
export function grantWebDataAccess(
  scope: Construct,
  fn: lambda.Function,
  config: InfraConfig,
  mediaBucketName: string,
): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "DynamoContentRead",
      actions: [
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable",
      ],
      resources: tableArnPatterns(scope, config),
    }),
  );
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "DynamoEphemeralCounterAccess",
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"],
      resources: tableArnPatterns(scope, config),
    }),
  );

  const bucketArn = `arn:aws:s3:::${mediaBucketName}`;
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "MediaObjectRead",
      actions: ["s3:GetObject"],
      resources: [`${bucketArn}/*`],
    }),
  );
}

/**
 * Grants `s3:PutObject` scoped to the canonical resume PDF cache key prefix
 * only — least privilege, since the public web app otherwise never writes to
 * the media bucket. Used by the web server function's `/api/pdf` write-through
 * and by the scheduled rebuild Lambda (WebStack).
 */
export function grantCanonicalResumePdfCacheWrite(
  fn: lambda.Function,
  mediaBucketName: string,
): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "CanonicalResumePdfCacheWrite",
      actions: ["s3:PutObject"],
      resources: [`arn:aws:s3:::${mediaBucketName}/system/*`],
    }),
  );
}

/** Admin CMS permissions: full content/media and AI history management. */
export function grantAdminDataAccess(
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

/**
 * Project-mcp permissions (ADR 0009): the only write-capable network Lambda.
 * `PutItem` on the project table (and its GSIs for the slug check read) and
 * nothing else; plus the same scoped rate-limit counter as candidate-mcp. It
 * can create rows but not update or delete them.
 */
export function grantProjectMcpDataAccess(
  scope: Construct,
  fn: lambda.Function,
  config: InfraConfig,
): void {
  const { account, region } = Stack.of(scope);
  const tableArn = (suffix: string) =>
    `arn:aws:dynamodb:${region}:${account}:table/${config.tablePrefix}-${suffix}`;

  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "ProjectMcpProjectWrite",
      actions: [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
      ],
      resources: [
        tableArn(TABLE_SUFFIXES.project),
        `${tableArn(TABLE_SUFFIXES.project)}/index/*`,
      ],
    }),
  );
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "ProjectMcpRateLimitCounter",
      actions: ["dynamodb:UpdateItem"],
      resources: [tableArn(TABLE_SUFFIXES.rateLimit)],
    }),
  );
}

/** The content tables `get_candidate_profile`/`get_candidate_facts` actually read. */
const CANDIDATE_MCP_READ_SUFFIXES = [
  TABLE_SUFFIXES.content,
  TABLE_SUFFIXES.experience,
  TABLE_SUFFIXES.project,
  TABLE_SUFFIXES.skill,
  TABLE_SUFFIXES.testimonial,
] as const;

/**
 * Candidate-mcp permissions: tighter than {@link grantWebDataAccess}'s
 * `${tablePrefix}-*` wildcard. This Lambda is reachable by external
 * automation over the network (see ADR 0003 / 0006), so it gets read-only
 * access to exactly the five tables its two tools query (plus their GSIs) —
 * not the resume-generation, media, or chat-cache tables — and a scoped
 * `UpdateItem` on the rate-limit table for its own per-client counters.
 */
export function grantCandidateMcpDataAccess(
  scope: Construct,
  fn: lambda.Function,
  config: InfraConfig,
): void {
  const { account, region } = Stack.of(scope);
  const tableArn = (suffix: string) =>
    `arn:aws:dynamodb:${region}:${account}:table/${config.tablePrefix}-${suffix}`;

  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "CandidateProfileContentRead",
      actions: [
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable",
      ],
      resources: CANDIDATE_MCP_READ_SUFFIXES.flatMap((suffix) => [
        tableArn(suffix),
        `${tableArn(suffix)}/index/*`,
      ]),
    }),
  );
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: "CandidateMcpRateLimitCounter",
      actions: ["dynamodb:UpdateItem"],
      resources: [tableArn(TABLE_SUFFIXES.rateLimit)],
    }),
  );
}
