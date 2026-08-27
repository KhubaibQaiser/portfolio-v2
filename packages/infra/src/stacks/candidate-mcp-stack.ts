import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { aliasToCloudFront } from "../domain";
import { appErrorMetric, grantCandidateMcpDataAccess } from "../naming";

/** Must match `ORIGIN_VERIFY_HEADER` in apps/candidate-mcp/src/origin-verify.ts. */
const ORIGIN_VERIFY_HEADER = "x-origin-verify";

export type CandidateMcpStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to `apps/candidate-mcp/src/lambda.ts`. */
  entry: string;
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
};

/**
 * The candidate-profile MCP server: a network-reachable, API-key-authenticated
 * Lambda behind CloudFront on its own subdomain (`mcp.<domain>`). See
 * docs/adr/0003-candidate-mcp-server.md and docs/adr/0005-candidate-mcp-api-keys.md.
 */
export class CandidateMcpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CandidateMcpStackProps) {
    super(scope, id, props);
    const { config, hostedZone, certificate } = props;

    const mcpHostname = `mcp.${config.domainName}`;
    const serverUrl = `https://${mcpHostname}/mcp`;

    const smokeTestKey = new secretsmanager.Secret(this, "SmokeTestKeySecret", {
      secretName: `/${config.appName.toLowerCase()}/candidate-mcp/smoke-test-key`,
      description: "Bearer token for the post-deploy candidate-mcp smoke test",
      generateSecretString: {
        passwordLength: 48,
        excludePunctuation: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const logGroup = new logs.LogGroup(this, "ServerFnLogs", {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const serverFunction = new NodejsFunction(this, "ServerFn", {
      entry: props.entry,
      handler: "lambdaHandler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      logGroup,
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        MCP_SERVER_URL: serverUrl,
        MCP_ENABLED: "true",
        POWERTOOLS_LOG_LEVEL: "INFO",
        MCP_SMOKE_TEST_KEY_SECRET_ARN: smokeTestKey.secretArn,
      },
    });
    grantCandidateMcpDataAccess(this, serverFunction, config);
    smokeTestKey.grantRead(serverFunction);

    const originVerify = new secretsmanager.Secret(this, "OriginVerifySecret", {
      secretName: `/${config.appName.toLowerCase()}/candidate-mcp/origin-verify`,
      description:
        "CloudFront origin-verify header for the candidate-mcp Function URL (not an API key)",
      generateSecretString: {
        passwordLength: 48,
        excludePunctuation: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const originVerifyValue = originVerify.secretValue.unsafeUnwrap();
    serverFunction.addEnvironment("ORIGIN_VERIFY_SECRET", originVerifyValue);

    const errorMetric = appErrorMetric(config);
    new logs.MetricFilter(this, "AppErrorMetric", {
      logGroup,
      metricNamespace: errorMetric.namespace,
      metricName: errorMetric.metricName,
      filterPattern: logs.FilterPattern.stringValue("$.level", "=", "ERROR"),
      metricValue: "1",
      defaultValue: 0,
    });

    const functionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const origin = new origins.FunctionUrlOrigin(functionUrl, {
      customHeaders: {
        [ORIGIN_VERIFY_HEADER]: originVerifyValue,
      },
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      domainNames: [mcpHostname],
      certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    aliasToCloudFront(this, hostedZone, distribution, "McpAlias", "mcp");

    new cdk.CfnOutput(this, "ServerUrl", { value: serverUrl });
  }
}
