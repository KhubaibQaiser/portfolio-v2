import * as cdk from "aws-cdk-lib";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";

export type AdminStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/admin/.open-next. */
  openNextDir: string;
  /** Content table from the DataStack (same region). */
  table: dynamodb.ITable;
  /** Media bucket from the DataStack (same region). */
  mediaBucket: s3.IBucket;
};

/**
 * Admin dashboard stack. Hosts the content-editing app via the OpenNext
 * {@link NextjsSite} construct on its own CloudFront distribution, isolated
 * from the public site. The server function gets read/write access to the
 * shared content table and media bucket so authors can edit portfolio data
 * and upload assets. Runs on the default CloudFront domain until
 * `domainEnabled` is set.
 */
export class AdminStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AdminStackProps) {
    super(scope, id, props);
    const { config, table, mediaBucket } = props;

    new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_NAME: table.tableName,
        S3_MEDIA_BUCKET: mediaBucket.bucketName,
      },
      grantServer: (fn) => {
        table.grantReadWriteData(fn);
        mediaBucket.grantReadWrite(fn);
      },
    });
  }
}
