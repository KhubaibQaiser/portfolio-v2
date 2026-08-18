import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";
import { aliasToCloudFront } from "../domain";
import { appErrorMetric, grantAdminDataAccess, ssmPaths } from "../naming";

export type AdminStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/admin/.open-next. */
  openNextDir: string;
  /** Dns/Cert stack constructs, only present when `config.domainEnabled`. */
  hostedZone?: route53.IHostedZone;
  certificate?: acm.ICertificate;
};

/**
 * Admin dashboard stack. Hosts the content-editing app via the OpenNext
 * {@link NextjsSite} construct on its own CloudFront distribution, isolated from
 * the public site. The server function gets read/write to the content tables
 * (by ARN pattern) and the media bucket (from the SSM registry); auth secrets
 * are read from SSM too. It imports nothing across stacks — see
 * docs/adr/0001-cross-stack-references.md.
 */
export class AdminStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AdminStackProps) {
    super(scope, id, props);
    const { config } = props;
    const paths = ssmPaths(config);

    const appOrigin = config.domainEnabled
      ? `https://admin.${config.domainName}`
      : config.adminUrls.find((u) => u.startsWith("https://"));

    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this,
      paths.mediaBucketName,
    );
    const mediaPublicBaseUrl = ssm.StringParameter.valueForStringParameter(
      this,
      paths.mediaPublicBaseUrl,
    );
    const ssmGet = (path: string) =>
      ssm.StringParameter.valueForStringParameter(this, path);

    const groqSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "GroqSecret",
      ssmGet(paths.groqApiKeyArn),
    );
    const anthropicSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "AnthropicSecret",
      ssmGet(paths.anthropicApiKeyArn),
    );

    const googleOAuthSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "GoogleOAuthSecret",
      ssmGet(paths.googleOAuthArn),
    );
    const betterAuthSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "BetterAuthSecret",
      ssmGet(paths.betterAuthSecretArn),
    );

    const site = new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      noindex: true,
      ...(config.domainEnabled && props.certificate
        ? {
            domain: {
              domainNames: [`admin.${config.domainName}`],
              certificate: props.certificate,
            },
          }
        : {}),
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucketName,
        MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
        POWERTOOLS_SERVICE_NAME: "portfolio-admin",
        POWERTOOLS_LOG_LEVEL: "WARN",
        GOOGLE_OAUTH_SECRET_ARN: googleOAuthSecret.secretArn,
        BETTER_AUTH_SECRET_ARN: betterAuthSecret.secretArn,
        ...(appOrigin ? { APP_ORIGIN: appOrigin } : {}),
        ADMIN_ALLOWED_EMAILS: config.adminAllowedEmails.join(","),
        GROQ_API_KEY_SECRET_ARN: groqSecret.secretArn,
        ANTHROPIC_API_KEY_SECRET_ARN: anthropicSecret.secretArn,
      },
      grantServer: (fn) => {
        grantAdminDataAccess(this, fn, config, mediaBucketName);
        groqSecret.grantRead(fn);
        anthropicSecret.grantRead(fn);
        googleOAuthSecret.grantRead(fn);
        betterAuthSecret.grantRead(fn);
      },
    });

    if (config.domainEnabled && props.hostedZone) {
      aliasToCloudFront(this, props.hostedZone, site.distribution, "AdminAlias", "admin");
    }

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
