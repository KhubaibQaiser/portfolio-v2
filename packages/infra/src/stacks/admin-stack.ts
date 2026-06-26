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
  /** Content/collection tables from the DataStack (same region). */
  tables: dynamodb.ITable[];
  /** Media bucket from the DataStack (same region). */
  mediaBucket: s3.IBucket;
  /** Cognito wiring from the AuthStack for admin sign-in. */
  auth: {
    userPoolId: string;
    userPoolClientId: string;
    hostedUiDomain: string;
  };
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
    const { config, tables, mediaBucket, auth } = props;

    // Public origin for OAuth redirect/logout URIs. The CloudFront Host header
    // is stripped before the Lambda origin, so the app can't derive this at
    // runtime — and referencing the distribution domain here would create a
    // Function↔Distribution cycle. Instead use the registered admin origin
    // (custom domain when enabled, else the CloudFront URL from `adminUrls`),
    // which must match a Cognito callback origin anyway.
    const appOrigin = config.domainEnabled
      ? `https://admin.${config.domainName}`
      : config.adminUrls.find((u) => u.startsWith("https://"));

    new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucket.bucketName,
        // Powertools structured logger (see @portfolio/observability).
        POWERTOOLS_SERVICE_NAME: "portfolio-admin",
        POWERTOOLS_LOG_LEVEL: "INFO",
        COGNITO_REGION: config.region,
        COGNITO_USER_POOL_ID: auth.userPoolId,
        COGNITO_CLIENT_ID: auth.userPoolClientId,
        COGNITO_DOMAIN: auth.hostedUiDomain,
        ...(appOrigin ? { APP_ORIGIN: appOrigin } : {}),
        // No fallback in-app: the admin throws if this is empty. Passed via
        // `-c adminAllowedEmails=...` (GitHub variable) at deploy.
        ADMIN_ALLOWED_EMAILS: config.adminAllowedEmails.join(","),
      },
      grantServer: (fn) => {
        for (const table of tables) table.grantReadWriteData(fn);
        mediaBucket.grantReadWrite(fn);
      },
    });
  }
}
