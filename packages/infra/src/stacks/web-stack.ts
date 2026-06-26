import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";
import { grantAppDataAccess, ssmPaths } from "../naming";

export type WebStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/web/.open-next. */
  openNextDir: string;
};

/**
 * Public site stack. Hosts the web app via the OpenNext {@link NextjsSite}
 * construct and grants its server function access to the content tables (by the
 * `${tablePrefix}-*` ARN pattern) and the media bucket (discovered from the SSM
 * registry). It imports nothing from the DataStack — see
 * docs/adr/0001-cross-stack-references.md. Runs on the default CloudFront domain
 * until `domainEnabled` is set.
 */
export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { config } = props;

    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this,
      ssmPaths(config).mediaBucketName,
    );

    new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucketName,
        // Powertools structured logger (see @portfolio/observability).
        POWERTOOLS_SERVICE_NAME: "portfolio-web",
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
      grantServer: (fn) => grantAppDataAccess(this, fn, config, mediaBucketName),
    });
  }
}
