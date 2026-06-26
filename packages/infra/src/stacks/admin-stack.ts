import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";
import { aliasToCloudFront, resolveHostedZone, resolveSiteCertificate } from "../domain";
import {
  appErrorMetric,
  grantAppDataAccess,
  grantSecretRead,
  secretArnForName,
  secretNames,
  ssmPaths,
} from "../naming";

export type AdminStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/admin/.open-next. */
  openNextDir: string;
};

/**
 * Admin dashboard stack. Hosts the content-editing app via the OpenNext
 * {@link NextjsSite} construct on its own CloudFront distribution, isolated from
 * the public site. The server function gets read/write to the content tables
 * (by ARN pattern) and the media bucket (from the SSM registry); the Cognito
 * wiring is read from SSM too. It imports nothing across stacks — see
 * docs/adr/0001-cross-stack-references.md.
 */
export class AdminStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AdminStackProps) {
    super(scope, id, props);
    const { config } = props;
    const paths = ssmPaths(config);

    // Public origin for OAuth redirect/logout URIs. The CloudFront Host header
    // is stripped before the Lambda origin, so the app can't derive this at
    // runtime — and referencing the distribution domain here would create a
    // Function↔Distribution cycle. Instead use the registered admin origin
    // (custom domain when enabled, else the CloudFront URL from `adminUrls`),
    // which must match a Cognito callback origin anyway.
    const appOrigin = config.domainEnabled
      ? `https://admin.${config.domainName}`
      : config.adminUrls.find((u) => u.startsWith("https://"));

    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this,
      paths.mediaBucketName,
    );
    // Cognito ids resolved from the SSM registry at deploy time (the AuthStack
    // publishes them) — non-secret config, baked into the Lambda env.
    const ssmGet = (path: string) =>
      ssm.StringParameter.valueForStringParameter(this, path);

    const secrets = secretNames(config);
    const groqSecretArn = secretArnForName(this, secrets.groqApiKey);
    const anthropicSecretArn = secretArnForName(this, secrets.anthropicApiKey);

    const site = new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      ...(config.domainEnabled
        ? {
            domain: {
              domainNames: [`admin.${config.domainName}`],
              certificate: resolveSiteCertificate(this, config),
            },
          }
        : {}),
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucketName,
        // Powertools structured logger (see @portfolio/observability). WARN keeps
        // ingestion low; the AppErrors metric filter below tracks ERROR lines.
        POWERTOOLS_SERVICE_NAME: "portfolio-admin",
        POWERTOOLS_LOG_LEVEL: "WARN",
        COGNITO_REGION: config.region,
        COGNITO_USER_POOL_ID: ssmGet(paths.authUserPoolId),
        COGNITO_CLIENT_ID: ssmGet(paths.authUserPoolClientId),
        COGNITO_DOMAIN: ssmGet(paths.authHostedUiDomain),
        ...(appOrigin ? { APP_ORIGIN: appOrigin } : {}),
        // No fallback in-app: the admin throws if this is empty. Passed via
        // `-c adminAllowedEmails=...` (GitHub variable) at deploy.
        ADMIN_ALLOWED_EMAILS: config.adminAllowedEmails.join(","),
        GROQ_API_KEY_SECRET_ARN: groqSecretArn,
        ANTHROPIC_API_KEY_SECRET_ARN: anthropicSecretArn,
      },
      grantServer: (fn) => {
        grantAppDataAccess(this, fn, config, mediaBucketName);
        grantSecretRead(this, fn, secrets.groqApiKey);
        grantSecretRead(this, fn, secrets.anthropicApiKey);
      },
    });

    if (config.domainEnabled) {
      const zone = resolveHostedZone(this, config);
      aliasToCloudFront(this, zone, site.distribution, "AdminAlias", "admin");
    }

    // Runtime errors → shared AppErrors metric (same namespace/name as the web
    // app, no dimensions, so the SharedStack alarms on both at once). ADR 0002.
    const errorMetric = appErrorMetric(config);
    new logs.MetricFilter(this, "AppErrorMetric", {
      logGroup: site.serverLogGroup,
      metricNamespace: errorMetric.namespace,
      metricName: errorMetric.metricName,
      filterPattern: logs.FilterPattern.stringValue("$.level", "=", "ERROR"),
      metricValue: "1",
      defaultValue: 0,
    });
  }
}
