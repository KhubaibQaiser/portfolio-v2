import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
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
  /** Absolute path to apps/admin's render-job DLQ handler Lambda entry (TS). */
  renderJobDlqHandlerEntry: string;
  /** Absolute path to apps/admin's generation-job worker Lambda entry (TS). */
  generationJobWorkerEntry: string;
  /** Absolute path to apps/admin's generation-job DLQ handler Lambda entry (TS). */
  generationJobDlqHandlerEntry: string;
  /** Absolute path to the job-ingest worker Lambda entry (TS). */
  jobIngestWorkerEntry: string;
  /** Absolute path to the job-notify (digest + follow-up) worker Lambda entry (TS). */
  jobNotifyWorkerEntry: string;
  /** Absolute path to the repo's pnpm-lock.yaml, for esbuild bundling cache-busting. */
  depsLockFilePath: string;
  /** Absolute path to packages/ui's resume-pdf font files (@react-pdf/renderer assets). */
  resumeFontsDir: string;
  /** Absolute path to apps/admin's render-job worker Lambda entry (TS). */
  renderJobWorkerEntry: string;
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
    const resendSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "ResendSecret",
      ssmGet(paths.resendApiKeyArn),
    );
    const jobspipeSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "JobspipeSecret",
      ssmGet(paths.jobspipeApiKeyArn),
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

    // --- Async admin PDF render jobs: SQS + DLQ + worker Lambda ---
    // POST /api/resume/export enqueues here so a Modern Blue fit-search
    // (or any render) runs on a worker with its own long timeout, off the
    // CloudFront/Lambda request path entirely.
    const renderJobDlq = new sqs.Queue(this, "RenderJobDlq", {
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    const renderJobQueue = new sqs.Queue(this, "RenderJobQueue", {
      // >= worker Lambda timeout (below) so SQS never redelivers a message
      // that's still being actively processed.
      visibilityTimeout: cdk.Duration.seconds(360),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: { queue: renderJobDlq, maxReceiveCount: 3 },
    });

    const renderJobWorkerFn = new nodeLambda.NodejsFunction(this, "RenderJobWorkerFn", {
      entry: props.renderJobWorkerEntry,
      depsLockFilePath: props.depsLockFilePath,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 2048,
      timeout: cdk.Duration.seconds(300),
      bundling: {
        externalModules: [],
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (_inputDir: string, outputDir: string) => [
            `mkdir -p "${outputDir}/public/fonts"`,
            `cp "${props.resumeFontsDir}"/*.ttf "${outputDir}/public/fonts/"`,
          ],
        },
      },
      logGroup: new logs.LogGroup(this, "RenderJobWorkerFnLogs", {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        S3_MEDIA_BUCKET: mediaBucketName,
        MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
        POWERTOOLS_SERVICE_NAME: "portfolio-admin-render-job-worker",
        POWERTOOLS_LOG_LEVEL: "WARN",
      },
    });
    grantAdminDataAccess(this, renderJobWorkerFn, config, mediaBucketName);
    renderJobWorkerFn.addEventSource(
      new lambdaEventSources.SqsEventSource(renderJobQueue, {
        batchSize: 5,
        reportBatchItemFailures: true,
      }),
    );

    const renderJobDlqHandlerFn = new nodeLambda.NodejsFunction(
      this,
      "RenderJobDlqHandlerFn",
      {
        entry: props.renderJobDlqHandlerEntry,
        depsLockFilePath: props.depsLockFilePath,
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        timeout: cdk.Duration.seconds(30),
        bundling: { externalModules: [] },
        logGroup: new logs.LogGroup(this, "RenderJobDlqHandlerFnLogs", {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        environment: {
          DATA_BACKEND: "dynamo",
          DYNAMO_TABLE_PREFIX: config.tablePrefix,
          POWERTOOLS_SERVICE_NAME: "portfolio-admin-render-job-dlq-handler",
          POWERTOOLS_LOG_LEVEL: "WARN",
        },
      },
    );
    grantAdminDataAccess(this, renderJobDlqHandlerFn, config, mediaBucketName);
    renderJobDlqHandlerFn.addEventSource(
      new lambdaEventSources.SqsEventSource(renderJobDlq, { batchSize: 1 }),
    );

    // --- Async admin AI generation jobs: SQS + DLQ + worker Lambda ---
    // POST /api/resume/generate enqueues here so LLM work runs off the
    // CloudFront 60s origin-read ceiling.
    const generationJobDlq = new sqs.Queue(this, "GenerationJobDlq", {
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    const generationJobQueue = new sqs.Queue(this, "GenerationJobQueue", {
      visibilityTimeout: cdk.Duration.seconds(360),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: { queue: generationJobDlq, maxReceiveCount: 3 },
    });

    const generationJobWorkerFn = new nodeLambda.NodejsFunction(
      this,
      "GenerationJobWorkerFn",
      {
        entry: props.generationJobWorkerEntry,
        depsLockFilePath: props.depsLockFilePath,
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 1536,
        timeout: cdk.Duration.seconds(300),
        bundling: { externalModules: [] },
        logGroup: new logs.LogGroup(this, "GenerationJobWorkerFnLogs", {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        environment: {
          DATA_BACKEND: "dynamo",
          DYNAMO_TABLE_PREFIX: config.tablePrefix,
          GROQ_API_KEY_SECRET_ARN: groqSecret.secretArn,
          ANTHROPIC_API_KEY_SECRET_ARN: anthropicSecret.secretArn,
          POWERTOOLS_SERVICE_NAME: "portfolio-admin-generation-job-worker",
          POWERTOOLS_LOG_LEVEL: "WARN",
        },
      },
    );
    grantAdminDataAccess(this, generationJobWorkerFn, config, mediaBucketName);
    groqSecret.grantRead(generationJobWorkerFn);
    anthropicSecret.grantRead(generationJobWorkerFn);
    generationJobWorkerFn.addEventSource(
      new lambdaEventSources.SqsEventSource(generationJobQueue, {
        batchSize: 1,
        reportBatchItemFailures: true,
      }),
    );

    const generationJobDlqHandlerFn = new nodeLambda.NodejsFunction(
      this,
      "GenerationJobDlqHandlerFn",
      {
        entry: props.generationJobDlqHandlerEntry,
        depsLockFilePath: props.depsLockFilePath,
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        timeout: cdk.Duration.seconds(30),
        bundling: { externalModules: [] },
        logGroup: new logs.LogGroup(this, "GenerationJobDlqHandlerFnLogs", {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        environment: {
          DATA_BACKEND: "dynamo",
          DYNAMO_TABLE_PREFIX: config.tablePrefix,
          POWERTOOLS_SERVICE_NAME: "portfolio-admin-generation-job-dlq-handler",
          POWERTOOLS_LOG_LEVEL: "WARN",
        },
      },
    );
    grantAdminDataAccess(this, generationJobDlqHandlerFn, config, mediaBucketName);
    generationJobDlqHandlerFn.addEventSource(
      new lambdaEventSources.SqsEventSource(generationJobDlq, { batchSize: 1 }),
    );

    const jobWorkerEnv: Record<string, string> = {
      DATA_BACKEND: "dynamo",
      DYNAMO_TABLE_PREFIX: config.tablePrefix,
      POWERTOOLS_LOG_LEVEL: "WARN",
      GROQ_API_KEY_SECRET_ARN: groqSecret.secretArn,
      ANTHROPIC_API_KEY_SECRET_ARN: anthropicSecret.secretArn,
      RESEND_API_KEY_SECRET_ARN: resendSecret.secretArn,
      JOBSPIPE_API_KEY_SECRET_ARN: jobspipeSecret.secretArn,
      ADMIN_ALLOWED_EMAILS: config.adminAllowedEmails.join(","),
      ...(appOrigin ? { APP_ORIGIN: appOrigin } : {}),
      ...(config.contactEmail ? { CONTACT_TO_EMAIL: config.contactEmail } : {}),
      ...(config.contactFromEmail ? { CONTACT_FROM_EMAIL: config.contactFromEmail } : {}),
    };

    // No reservedConcurrentExecutions: this account's ConcurrentExecutions
    // quota is 10, and AWS will not let unreserved drop below 10 (ADR 0003).
    // Ingest stays sequential via EventBridge rate(4 hours) + 300s timeout
    // (a tick cannot overlap the next). Revisit a reserved cap after a quota increase.
    const jobIngestWorkerFn = new nodeLambda.NodejsFunction(this, "JobIngestWorkerFn", {
      entry: props.jobIngestWorkerEntry,
      depsLockFilePath: props.depsLockFilePath,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      bundling: { externalModules: [] },
      logGroup: new logs.LogGroup(this, "JobIngestWorkerFnLogs", {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        ...jobWorkerEnv,
        POWERTOOLS_SERVICE_NAME: "portfolio-admin-job-ingest-worker",
      },
    });
    grantAdminDataAccess(this, jobIngestWorkerFn, config, mediaBucketName);
    groqSecret.grantRead(jobIngestWorkerFn);
    anthropicSecret.grantRead(jobIngestWorkerFn);
    resendSecret.grantRead(jobIngestWorkerFn);
    jobspipeSecret.grantRead(jobIngestWorkerFn);

    // Paused while scraping/matcher behavior is under review. Manual
    // "Run ingest now" still invokes the same Lambda code path via the
    // Admin server action. Flip enabled back to true when matching is fixed.
    new events.Rule(this, "JobIngestSchedule", {
      schedule: events.Schedule.rate(cdk.Duration.hours(4)),
      targets: [new targets.LambdaFunction(jobIngestWorkerFn)],
      enabled: false,
    });

    const jobNotifyWorkerFn = new nodeLambda.NodejsFunction(this, "JobNotifyWorkerFn", {
      entry: props.jobNotifyWorkerEntry,
      depsLockFilePath: props.depsLockFilePath,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      bundling: { externalModules: [] },
      logGroup: new logs.LogGroup(this, "JobNotifyWorkerFnLogs", {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        ...jobWorkerEnv,
        POWERTOOLS_SERVICE_NAME: "portfolio-admin-job-notify-worker",
      },
    });
    grantAdminDataAccess(this, jobNotifyWorkerFn, config, mediaBucketName);
    resendSecret.grantRead(jobNotifyWorkerFn);

    // 07:00 UTC ≈ 07:00 Europe/London in winter / 08:00 BST. EventBridge rules
    // are UTC-only; a timezone-aware Scheduler is not worth a new IAM surface.
    new events.Rule(this, "JobNotifySchedule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "7" }),
      targets: [new targets.LambdaFunction(jobNotifyWorkerFn)],
    });

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
        RESEND_API_KEY_SECRET_ARN: resendSecret.secretArn,
        JOBSPIPE_API_KEY_SECRET_ARN: jobspipeSecret.secretArn,
        RENDER_JOB_QUEUE_URL: renderJobQueue.queueUrl,
        GENERATION_JOB_QUEUE_URL: generationJobQueue.queueUrl,
        ...(config.contactEmail ? { CONTACT_TO_EMAIL: config.contactEmail } : {}),
        ...(config.contactFromEmail
          ? { CONTACT_FROM_EMAIL: config.contactFromEmail }
          : {}),
      },
      grantServer: (fn) => {
        grantAdminDataAccess(this, fn, config, mediaBucketName);
        groqSecret.grantRead(fn);
        anthropicSecret.grantRead(fn);
        googleOAuthSecret.grantRead(fn);
        betterAuthSecret.grantRead(fn);
        resendSecret.grantRead(fn);
        jobspipeSecret.grantRead(fn);
        renderJobQueue.grantSendMessages(fn);
        generationJobQueue.grantSendMessages(fn);
      },
    });

    if (config.domainEnabled && props.hostedZone) {
      aliasToCloudFront(this, props.hostedZone, site.distribution, "AdminAlias", "admin");
    }

    // Every ERROR-level log line — from the server function or the render-
    // job / generation-job Lambdas — feeds the same single symptom-based
    // alarm (ADR 0002).
    const errorMetric = appErrorMetric(config);
    for (const [id, logGroup] of [
      ["AppErrorMetric", site.serverLogGroup],
      ["RenderJobWorkerErrorMetric", renderJobWorkerFn.logGroup],
      ["RenderJobDlqHandlerErrorMetric", renderJobDlqHandlerFn.logGroup],
      ["GenerationJobWorkerErrorMetric", generationJobWorkerFn.logGroup],
      ["GenerationJobDlqHandlerErrorMetric", generationJobDlqHandlerFn.logGroup],
      ["JobIngestWorkerErrorMetric", jobIngestWorkerFn.logGroup],
      ["JobNotifyWorkerErrorMetric", jobNotifyWorkerFn.logGroup],
    ] as const) {
      new logs.MetricFilter(this, id, {
        logGroup,
        metricNamespace: errorMetric.namespace,
        metricName: errorMetric.metricName,
        filterPattern: logs.FilterPattern.stringValue("$.level", "=", "ERROR"),
        metricValue: "1",
        defaultValue: 0,
      });
    }
  }
}
