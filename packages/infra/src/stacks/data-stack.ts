import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { TABLE_SUFFIXES } from "@portfolio/data/tables";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { secretNames, ssmPaths } from "../naming";

export type DataStackProps = cdk.StackProps & {
  config: InfraConfig;
};

const STRING = dynamodb.AttributeType.STRING;

/**
 * Stateful data layer: the per-entity DynamoDB tables and the S3 media bucket.
 *
 * Each aggregate gets its own table with a clean, readable key schema — no
 * opaque composite keys — so content is easy to browse and manage. Table names
 * come from the shared `TABLE_SUFFIXES` (`@portfolio/data/tables`) as
 * `<tablePrefix>-<suffix>`, so the apps (which resolve them from
 * `DYNAMO_TABLE_PREFIX`) and this stack can never drift. The `tablePrefix` is a
 * versionable knob — bumping it (e.g. `portfolio` → `portfolio-v2`) stands up a
 * fresh table set for a blue/green data migration.
 *
 * Nothing is exported across stacks: the media bucket is auto-named and its name
 * is published to the SSM registry, while consumers grant DynamoDB by the
 * deterministic `${tablePrefix}-*` ARN pattern. This avoids CloudFormation's
 * "export in use" deadlock — see docs/adr/0001-cross-stack-references.md.
 *
 * Content/collection tables are RETAIN + deletion-protected with PITR so a stack
 * teardown never destroys content; the rate-limit table is ephemeral.
 */
export class DataStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const { config } = props;
    const prefix = config.tablePrefix;

    /** A durable content/collection table: PITR + deletion protection + RETAIN. */
    const durableTable = (
      construct: string,
      suffix: string,
      partitionKey: dynamodb.Attribute,
    ): dynamodb.Table =>
      new dynamodb.Table(this, construct, {
        tableName: `${prefix}-${suffix}`,
        partitionKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
        deletionProtection: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

    durableTable("ContentTable", TABLE_SUFFIXES.content, {
      name: "section",
      type: STRING,
    });
    durableTable("ExperienceTable", TABLE_SUFFIXES.experience, {
      name: "id",
      type: STRING,
    });

    const projectTable = durableTable("ProjectTable", TABLE_SUFFIXES.project, {
      name: "id",
      type: STRING,
    });
    projectTable.addGlobalSecondaryIndex({
      indexName: "by-slug",
      partitionKey: { name: "slug", type: STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    durableTable("SkillTable", TABLE_SUFFIXES.skill, { name: "id", type: STRING });
    durableTable("TestimonialTable", TABLE_SUFFIXES.testimonial, {
      name: "id",
      type: STRING,
    });
    durableTable("ResumeVariantTable", TABLE_SUFFIXES.resumeVariant, {
      name: "id",
      type: STRING,
    });
    durableTable("MediaTable", TABLE_SUFFIXES.media, { name: "id", type: STRING });

    const resumeGenerationTable = durableTable(
      "ResumeGenerationTable",
      TABLE_SUFFIXES.resumeGeneration,
      { name: "id", type: STRING },
    );
    // Per-user usage window (cost cap).
    resumeGenerationTable.addGlobalSecondaryIndex({
      indexName: "by-user",
      partitionKey: { name: "created_by", type: STRING },
      sortKey: { name: "created_at", type: STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    // Global recency feed for the bounded history list.
    resumeGenerationTable.addGlobalSecondaryIndex({
      indexName: "recent",
      partitionKey: { name: "recent_pk", type: STRING },
      sortKey: { name: "created_at", type: STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Ephemeral rate-limiter counters: TTL sweep, no PITR, safe to recreate.
    new dynamodb.Table(this, "RateLimitTable", {
      tableName: `${prefix}-${TABLE_SUFFIXES.rateLimit}`,
      partitionKey: { name: "pk", type: STRING },
      sortKey: { name: "sk", type: STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Ephemeral chat response cache: exact-match FAQ replies, TTL sweep.
    new dynamodb.Table(this, "ChatCacheTable", {
      tableName: `${prefix}-${TABLE_SUFFIXES.chatCache}`,
      partitionKey: { name: "pk", type: STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Auto-named (no fixed bucketName) so it can be replaced/migrated cleanly;
    // S3 names are global + immutable, so a deterministic name is the worst case
    // for migration. Consumers discover the name from the SSM registry below.
    const mediaBucket = new s3.Bucket(this, "MediaBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          // Direct browser uploads via presigned PUTs from the admin app.
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: config.mediaCorsOrigins,
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    // Publish the bucket name to the SSM registry for the apps to discover
    // (instead of a cross-stack CloudFormation export).
    new ssm.StringParameter(this, "MediaBucketNameParam", {
      parameterName: ssmPaths(config).mediaBucketName,
      stringValue: mediaBucket.bucketName,
    });

    const mediaCdn = new cloudfront.Distribution(this, "MediaCdn", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(mediaBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    const mediaPublicBaseUrl = `https://${mediaCdn.distributionDomainName}`;
    new ssm.StringParameter(this, "MediaPublicBaseUrlParam", {
      parameterName: ssmPaths(config).mediaPublicBaseUrl,
      stringValue: mediaPublicBaseUrl,
    });

    // --- Runtime AI key secrets ---
    // CDK owns the secret *resources* (existence + IAM contract) so the set of
    // keys the app needs is explicit in IaC, not discovered by reading code; the
    // actual values are injected out-of-band (`aws secretsmanager
    // put-secret-value`) so plaintext never lives in code or templates. The
    // auto-generated complete ARN (incl. the random suffix) is published to the
    // SSM registry for the apps to import — never a hand-built partial ARN.
    // DESTROY (unlike the tables/bucket): the values are externally injected and
    // trivially re-creatable, so they shouldn't outlive the stack. CloudFormation
    // schedules the delete with a recovery window — to immediately reuse the name
    // (e.g. teardown + redeploy) run `delete-secret --force-delete-without-recovery`.
    const names = secretNames(config);
    const paths = ssmPaths(config);
    const aiSecret = (
      construct: string,
      secretName: string,
      arnParamName: string,
      label: string,
    ) => {
      const secret = new secretsmanager.Secret(this, construct, {
        secretName,
        description: `${label} (value set out-of-band via put-secret-value)`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
      new ssm.StringParameter(this, `${construct}ArnParam`, {
        parameterName: arnParamName,
        stringValue: secret.secretArn,
      });
    };
    aiSecret("GroqApiKeySecret", names.groqApiKey, paths.groqApiKeyArn, "Groq API key");
    aiSecret(
      "AnthropicApiKeySecret",
      names.anthropicApiKey,
      paths.anthropicApiKeyArn,
      "Anthropic API key",
    );
    aiSecret(
      "ResendApiKeySecret",
      names.resendApiKey,
      paths.resendApiKeyArn,
      "Resend API key",
    );
    aiSecret(
      "TurnstileSecretKeySecret",
      names.turnstileSecretKey,
      paths.turnstileSecretKeyArn,
      "Cloudflare Turnstile secret key",
    );

    new cdk.CfnOutput(this, "TablePrefix", {
      value: prefix,
      description: "Set as DYNAMO_TABLE_PREFIX in the apps",
    });
    new cdk.CfnOutput(this, "MediaBucketName", {
      value: mediaBucket.bucketName,
      description: "S3_MEDIA_BUCKET (also published to SSM for the apps)",
    });
    new cdk.CfnOutput(this, "MediaPublicBaseUrl", {
      value: mediaPublicBaseUrl,
      description: "MEDIA_PUBLIC_BASE_URL (CloudFront CDN for uploaded media)",
    });
  }
}
