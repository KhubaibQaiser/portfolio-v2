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
    authUserPoolId: `${base}/auth/user-pool-id`,
    authUserPoolClientId: `${base}/auth/user-pool-client-id`,
    authHostedUiDomain: `${base}/auth/hosted-ui-domain`,
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
