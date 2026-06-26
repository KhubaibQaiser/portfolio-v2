import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";

export type DataStackProps = cdk.StackProps & {
  config: InfraConfig;
};

const STRING = dynamodb.AttributeType.STRING;

/**
 * Stateful data layer: the per-entity DynamoDB tables and the S3 media bucket.
 *
 * Each aggregate gets its own table with a clean, readable key schema — no
 * opaque composite keys — so content is easy to browse and manage. Table names
 * are `<tablePrefix>-<suffix>` and MUST stay in sync with
 * `packages/data/src/dynamo/tables.ts` (the apps resolve them from
 * `DYNAMO_TABLE_PREFIX`). Content/collection tables are RETAIN +
 * deletion-protected with PITR so a stack teardown never destroys content; the
 * rate-limit table is ephemeral (regenerable counters).
 */
export class DataStack extends cdk.Stack {
  /** All content/collection + rate-limit tables (granted to the app Lambdas
   *  and alarmed by the SharedStack). */
  readonly tables: dynamodb.Table[];
  readonly mediaBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const prefix = props.config.tablePrefix;

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

    const contentTable = durableTable("ContentTable", "content", {
      name: "section",
      type: STRING,
    });

    const experienceTable = durableTable("ExperienceTable", "experience", {
      name: "id",
      type: STRING,
    });

    const projectTable = durableTable("ProjectTable", "project", {
      name: "id",
      type: STRING,
    });
    projectTable.addGlobalSecondaryIndex({
      indexName: "by-slug",
      partitionKey: { name: "slug", type: STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const skillTable = durableTable("SkillTable", "skill", { name: "id", type: STRING });
    const testimonialTable = durableTable("TestimonialTable", "testimonial", {
      name: "id",
      type: STRING,
    });
    const resumeVariantTable = durableTable("ResumeVariantTable", "resume-variant", {
      name: "id",
      type: STRING,
    });
    const mediaTable = durableTable("MediaTable", "media", { name: "id", type: STRING });

    const resumeGenerationTable = durableTable(
      "ResumeGenerationTable",
      "resume-generation",
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
    const rateLimitTable = new dynamodb.Table(this, "RateLimitTable", {
      tableName: `${prefix}-rate-limit`,
      partitionKey: { name: "pk", type: STRING },
      sortKey: { name: "sk", type: STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.tables = [
      contentTable,
      experienceTable,
      projectTable,
      skillTable,
      testimonialTable,
      resumeVariantTable,
      mediaTable,
      resumeGenerationTable,
      rateLimitTable,
    ];

    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          // Direct browser uploads via presigned PUTs from the admin app.
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: props.config.mediaCorsOrigins,
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    new cdk.CfnOutput(this, "TablePrefix", {
      value: prefix,
      description: "Set as DYNAMO_TABLE_PREFIX in the apps",
    });
    new cdk.CfnOutput(this, "MediaBucketName", {
      value: this.mediaBucket.bucketName,
      description: "Set as S3_MEDIA_BUCKET in the apps",
    });
  }
}
