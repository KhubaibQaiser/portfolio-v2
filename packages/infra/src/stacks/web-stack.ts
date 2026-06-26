import * as cdk from "aws-cdk-lib";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";

export type WebStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/web/.open-next. */
  openNextDir: string;
  /** Content/collection tables from the DataStack (same region). */
  tables: dynamodb.ITable[];
  /** Media bucket from the DataStack (same region). */
  mediaBucket: s3.IBucket;
};

/**
 * Public site stack. Hosts the web app via the OpenNext {@link NextjsSite}
 * construct and grants its server function read/write access to the shared
 * content table and media bucket. Runs on the default CloudFront domain until
 * `domainEnabled` is set.
 */
export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { config, tables, mediaBucket } = props;

    new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucket.bucketName,
        // Powertools structured logger (see @portfolio/observability).
        POWERTOOLS_SERVICE_NAME: "portfolio-web",
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
      grantServer: (fn) => {
        for (const table of tables) table.grantReadWriteData(fn);
        mediaBucket.grantReadWrite(fn);
      },
    });
  }
}
