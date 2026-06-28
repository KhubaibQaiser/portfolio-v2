import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";
import { aliasToCloudFront, resolveHostedZone, resolveSiteCertificate } from "../domain";
import {
  appErrorMetric,
  grantAppDataAccess,
  ssmPaths,
} from "../naming";

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

    // Import the CDK-owned secret by its complete ARN (published to SSM by the
    // DataStack). grantRead scopes IAM to exactly that ARN, and we pass the same
    // complete ARN to the app — no hand-built or partial ARNs anywhere.
    const groqSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "GroqSecret",
      ssm.StringParameter.valueForStringParameter(this, paths.groqApiKeyArn),
    );
    const revalidateSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "RevalidateSecret",
      ssm.StringParameter.valueForStringParameter(this, paths.revalidateSecretArn),
    );

    const site = new NextjsSite(this, "Site", {
      openNextDir: props.openNextDir,
      region: config.region,
      ...(config.domainEnabled
        ? {
            domain: {
              domainNames: [config.domainName, `www.${config.domainName}`],
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
        POWERTOOLS_SERVICE_NAME: "portfolio-web",
        POWERTOOLS_LOG_LEVEL: "WARN",
        ...(config.domainEnabled
          ? { NEXT_PUBLIC_SITE_URL: `https://${config.domainName}` }
          : {}),
        GROQ_API_KEY_SECRET_ARN: groqSecret.secretArn,
        REVALIDATE_SECRET_ARN: revalidateSecret.secretArn,
      },
      grantServer: (fn) => {
        grantAppDataAccess(this, fn, config, mediaBucketName);
        groqSecret.grantRead(fn);
        revalidateSecret.grantRead(fn);
      },
    });

    const webSiteUrl = config.domainEnabled
      ? `https://${config.domainName}`
      : `https://${site.distribution.distributionDomainName}`;
    new ssm.StringParameter(this, "WebSiteUrlParam", {
      parameterName: paths.webSiteUrl,
      stringValue: webSiteUrl,
    });

    if (config.domainEnabled) {
      const zone = resolveHostedZone(this, config);
      aliasToCloudFront(this, zone, site.distribution, "ApexAlias");
      aliasToCloudFront(this, zone, site.distribution, "WwwAlias", "www");
    }

    // Surface runtime errors as one cheap, account-rolled-up metric (no
    // dimensions, so web + admin share a single time series the SharedStack
    // alarms on). See ADR 0002.
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
