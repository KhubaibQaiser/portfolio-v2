import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { NextjsSite } from "../constructs/nextjs-site";
import type { InfraConfig } from "../config";
import { aliasToCloudFront } from "../domain";
import {
  appErrorMetric,
  grantCanonicalResumePdfCacheWrite,
  grantWebDataAccess,
  ssmPaths,
} from "../naming";

export type WebStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to apps/web/.open-next. */
  openNextDir: string;
  /** Absolute path to apps/web's canonical-PDF rebuild Lambda entry (TS). */
  rebuildCanonicalPdfEntry: string;
  /** Absolute path to the repo's pnpm-lock.yaml, for esbuild bundling cache-busting. */
  depsLockFilePath: string;
  /** Absolute path to packages/ui's resume-pdf font files (@react-pdf/renderer assets). */
  resumeFontsDir: string;
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
            canonicalApexHost: config.domainName,
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
        ...(config.posthogProjectToken
          ? {
              NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: config.posthogProjectToken,
              NEXT_PUBLIC_POSTHOG_HOST: config.posthogHost ?? "https://us.i.posthog.com",
              ...(config.posthogEnvironment
                ? { POSTHOG_ENVIRONMENT: config.posthogEnvironment }
                : {}),
            }
          : {}),
      },
      grantServer: (fn) => {
        grantWebDataAccess(this, fn, config, mediaBucketName);
        // Needed for /api/pdf's cache write-through (the S3 read-first path
        // above already covers reads via grantWebDataAccess).
        grantCanonicalResumePdfCacheWrite(fn, mediaBucketName);
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

    // --- Canonical resume PDF: scheduled rebuild, off any request path ---
    // Pure insurance to keep /api/pdf's S3 cache warm (see resume-pdf-cache.ts
    // and the route itself, which already write-throughs on every cache miss
    // and never depends on this Lambda for correctness). A generous timeout is
    // safe here precisely because it's off the CloudFront/Lambda-timeout path.
    const rebuildFn = new nodeLambda.NodejsFunction(this, "RebuildCanonicalPdfFn", {
      entry: props.rebuildCanonicalPdfEntry,
      depsLockFilePath: props.depsLockFilePath,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1536,
      timeout: cdk.Duration.seconds(120),
      bundling: {
        // Bundle the AWS SDK too instead of relying on the runtime-provided
        // version, per AWS's own guidance, so this Lambda's SDK version
        // always matches what the rest of the monorepo was built and tested
        // against.
        externalModules: [],
        // @react-pdf/renderer needs the actual .ttf files on disk at
        // runtime (esbuild only bundles the JS import graph, not binary
        // assets). registerResumePdfFonts() falls back to
        // `${cwd}/public/fonts/*`, which is `/var/task/public/fonts/*` for
        // a Lambda — so copy them there after bundling.
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (_inputDir: string, outputDir: string) => [
            `mkdir -p "${outputDir}/public/fonts"`,
            `cp "${props.resumeFontsDir}"/*.ttf "${outputDir}/public/fonts/"`,
          ],
        },
      },
      logGroup: new logs.LogGroup(this, "RebuildCanonicalPdfFnLogs", {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucketName,
        MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
        POWERTOOLS_SERVICE_NAME: "portfolio-web-rebuild-canonical-pdf",
        POWERTOOLS_LOG_LEVEL: "WARN",
        ...(config.domainEnabled
          ? { NEXT_PUBLIC_SITE_URL: `https://${config.domainName}` }
          : {}),
      },
    });
    grantWebDataAccess(this, rebuildFn, config, mediaBucketName);
    grantCanonicalResumePdfCacheWrite(rebuildFn, mediaBucketName);

    new events.Rule(this, "RebuildCanonicalPdfSchedule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(rebuildFn)],
    });

    new logs.MetricFilter(this, "RebuildCanonicalPdfErrorMetric", {
      logGroup: rebuildFn.logGroup,
      metricNamespace: errorMetric.namespace,
      metricName: errorMetric.metricName,
      filterPattern: logs.FilterPattern.stringValue("$.level", "=", "ERROR"),
      metricValue: "1",
      defaultValue: 0,
    });
  }
}
