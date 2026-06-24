import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";

export type DataStackProps = cdk.StackProps & {
  config: InfraConfig;
};

/**
 * Stateful data layer: the single DynamoDB content table and the S3 media
 * bucket. Both are RETAIN + deletion-protected so tearing the stack down never
 * destroys content/uploads. The table schema mirrors packages/data
 * (`dynamo/table.ts`): pk/sk primary key, one `gsi1` index, on-demand billing,
 * and a `ttl` attribute used by the rate limiter.
 */
export class DataStack extends cdk.Stack {
  readonly table: dynamodb.Table;
  readonly mediaBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const { config } = props;

    this.table = new dynamodb.Table(this, "ContentTable", {
      tableName: config.tableName,
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
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

    new cdk.CfnOutput(this, "ContentTableName", {
      value: this.table.tableName,
      description: "Set as DYNAMO_TABLE_NAME in the apps",
    });
    new cdk.CfnOutput(this, "MediaBucketName", {
      value: this.mediaBucket.bucketName,
      description: "Set as S3_MEDIA_BUCKET in the apps",
    });
  }
}
