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
import { appErrorMetric, grantAppDataAccess, ssmPaths } from "../naming";

export type WebStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/web/.open-next. */
  openNextDir: string;
  /** Dns/Cert stack constructs, only present when `config.domainEnabled`. */
  hostedZone?: route53.IHostedZone;
  certificate?: acm.ICertificate;
};

/**
 * Public site stack. Hosts the web app via the OpenNext {@link NextjsSite}
 * construct and grants its server function access to the content tables (by the
 * `${tablePrefix}-*` ARN pattern) and the media bucket (discovered from the SSM
 * registry). It imports nothing from the DataStack — see
 * docs/adr/0001-cross-stack-references.md. Runs on the default CloudFront domain
 * until `-c domainEnabled=true` (custom domain + Route 53 aliases).
 */
export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { config } = props;

    const paths = ssmPaths(config);
    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this,
      paths.mediaBucketName,
    );
    const mediaPublicBaseUrl = ssm.StringParameter.valueForStringParameter(
      this,
      paths.mediaPublicBaseUrl,
    );

    const groqSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "GroqSecret",
      ssm.StringParameter.valueForStringParameter(this, paths.groqApiKeyArn),
    );

    const resendSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "ResendSecret",
      ssm.StringParameter.valueForStringParameter(this, paths.resendApiKeyArn),
    );

    const turnstileSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "TurnstileSecret",
      ssm.StringParameter.valueForStringParameter(this, paths.turnstileSecretKeyArn),
    );

    const site = new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      ...(config.domainEnabled && props.certificate
        ? {
            domain: {
              domainNames: [config.domainName, `www.${config.domainName}`],
              certificate: props.certificate,
            },
          }
        : {}),
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucketName,
        MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
        POWERTOOLS_SERVICE_NAME: "portfolio-web",
        POWERTOOLS_LOG_LEVEL: "WARN",
        ...(config.domainEnabled
          ? { NEXT_PUBLIC_SITE_URL: `https://${config.domainName}` }
          : {}),
        GROQ_API_KEY_SECRET_ARN: groqSecret.secretArn,
        RESEND_API_KEY_SECRET_ARN: resendSecret.secretArn,
        TURNSTILE_SECRET_KEY_SECRET_ARN: turnstileSecret.secretArn,
        ...(config.contactEmail ? { CONTACT_TO_EMAIL: config.contactEmail } : {}),
        ...(config.contactFromEmail
          ? { CONTACT_FROM_EMAIL: config.contactFromEmail }
          : {}),
      },
      grantServer: (fn) => {
        grantAppDataAccess(this, fn, config, mediaBucketName);
        groqSecret.grantRead(fn);
        resendSecret.grantRead(fn);
        turnstileSecret.grantRead(fn);
      },
    });

    if (config.domainEnabled && props.hostedZone) {
      aliasToCloudFront(this, props.hostedZone, site.distribution, "ApexAlias");
      aliasToCloudFront(this, props.hostedZone, site.distribution, "WwwAlias", "www");
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
