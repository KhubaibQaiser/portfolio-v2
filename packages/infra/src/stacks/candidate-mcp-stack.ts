import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import { restoreWwwAuthenticateFunctionCode } from "../cloudfront/restore-www-authenticate";
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
 * The candidate-profile MCP server: a network-reachable, OAuth-authenticated
 * Lambda behind CloudFront on its own subdomain (`mcp.<domain>`). See
 * docs/adr/0003-candidate-mcp-server.md for the full trust-boundary decision.
 *
 * Requires a stable custom domain — the Cognito resource-server identifier,
 * the OAuth issuer/metadata URLs, and this server's own Host-header
 * allowlist are all derived from it — so, unlike Web/Admin/Storybook, this
 * stack is only instantiated when `config.domainEnabled` (see
 * `bin/portfolio.ts`). There is nothing meaningful to demo on a
 * `*.cloudfront.net` URL that would change on every redeploy.
 *
 * Auth: a Cognito User Pool used purely as an OAuth 2.1 client-credentials
 * (M2M) provider — no human users, no hosted UI sign-in. Each external
 * automation consumer (n8n today, Apify actors later) gets its own app
 * client scoped to the single `profile.read` custom scope; provisioning a
 * new consumer is a CDK change, not an app code change (see
 * `verify-agent-token.ts`'s `clientId: null` comment).
 */
export class CandidateMcpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CandidateMcpStackProps) {
    super(scope, id, props);
    const { config, hostedZone, certificate } = props;

    const mcpHostname = `mcp.${config.domainName}`;
    const serverUrl = `https://${mcpHostname}/mcp`;
    const resourceServerIdentifier = `https://${mcpHostname}`;

    // --- Auth: Cognito user pool as a pure OAuth client-credentials (M2M) IdP ---
    const userPool = new cognito.UserPool(this, "AgentPool", {
      userPoolName: `${config.appName}-candidate-mcp-agents`,
      selfSignUpEnabled: false,
      // No human users ever sign in to this pool (M2M-only), so the paid
      // Essentials/Plus feature tiers (MAU-priced) buy nothing here — Lite
      // is the cost-correct choice (ADR 0002). M2M token-request billing is
      // separate from the feature-plan tier regardless.
      featurePlan: cognito.FeaturePlan.LITE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Hosted-UI domain is only used for its `/oauth2/token` endpoint — no
    // browser sign-in ever happens against this pool.
    const domain = userPool.addDomain("AgentPoolDomain", {
      cognitoDomain: { domainPrefix: config.mcpCognitoDomainPrefix },
    });

    const profileReadScope = new cognito.ResourceServerScope({
      scopeName: "profile.read",
      scopeDescription: "Read the candidate's public profile and fact sheet",
    });
    const resourceServer = userPool.addResourceServer("ProfileResourceServer", {
      identifier: resourceServerIdentifier,
      userPoolResourceServerName: "candidate-profile",
      scopes: [profileReadScope],
    });

    // The first consumer: an n8n workflow calling this server as part of the
    // Phase 2 job-matching pipeline. Additional consumers (e.g. an Apify
    // actor) are added the same way — a new `addClient` call, no app change.
    const n8nClient = userPool.addClient("N8nWorkflowClient", {
      userPoolClientName: "n8n-workflow",
      generateSecret: true,
      authFlows: {},
      oAuth: {
        flows: { clientCredentials: true },
        scopes: [cognito.OAuthScope.resourceServer(resourceServer, profileReadScope)],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      preventUserExistenceErrors: true,
    });

    // The client secret never appears in source, CI logs, or CloudFormation
    // outputs — it is written straight into Secrets Manager as a CDK-owned
    // resource, mirroring the DataStack's AI-key secrets. Whoever configures
    // the n8n credential reads it from here (console or `get-secret-value`).
    new secretsmanager.Secret(this, "N8nWorkflowClientSecret", {
      secretName: `/${config.appName.toLowerCase()}/candidate-mcp/n8n-workflow-client`,
      description:
        "Cognito client_id/client_secret for the n8n workflow's client-credentials grant against the candidate-mcp server",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      secretObjectValue: {
        clientId: cdk.SecretValue.unsafePlainText(n8nClient.userPoolClientId),
        clientSecret: n8nClient.userPoolClientSecret,
        tokenEndpoint: cdk.SecretValue.unsafePlainText(
          `${domain.baseUrl()}/oauth2/token`,
        ),
        scope: cdk.SecretValue.unsafePlainText(
          `${resourceServerIdentifier}/profile.read`,
        ),
      },
    });

    // --- Compute: the MCP server itself ---
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
      // Do not set reservedConcurrentExecutions. Personal AWS accounts often
      // have a ConcurrentExecutions quota of 10, and Lambda refuses any
      // reservation that would leave UnreservedConcurrentExecution below 10.
      // Cost/abuse is still bounded by CloudFront origin-verify, Cognito, and
      // the function timeout (ADR 0003).
      environment: {
        DATA_BACKEND: "dynamo",
        DYNAMO_TABLE_PREFIX: config.tablePrefix,
        MCP_SERVER_URL: serverUrl,
        MCP_RESOURCE_SERVER_IDENTIFIER: resourceServerIdentifier,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_REGION: config.region,
        COGNITO_DOMAIN: domain.domainName,
        MCP_ENABLED: "true",
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });
    grantCandidateMcpDataAccess(this, serverFunction, config);

    // Network-layer shared secret: CloudFront injects this header (overwriting
    // any viewer copy). Distinct from the n8n Cognito client secret — this one
    // answers "did the request come through our distribution?", not "which
    // automation client is this?". The value is a CloudFormation dynamic
    // reference into both the origin header and Lambda env — never git or a
    // CfnOutput.
    const originVerify = new secretsmanager.Secret(this, "OriginVerifySecret", {
      secretName: `/${config.appName.toLowerCase()}/candidate-mcp/origin-verify`,
      description:
        "CloudFront origin-verify header for the candidate-mcp Function URL (not an OAuth client secret)",
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

    // --- Network: Function URL behind CloudFront. OAC/SigV4 cannot be used
    // here — it consumes `Authorization`, which MCP needs for Bearer tokens
    // (ADR 0003). Origin-verify is the network lock; Cognito JWT is identity.
    const functionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const origin = new origins.FunctionUrlOrigin(functionUrl, {
      customHeaders: {
        [ORIGIN_VERIFY_HEADER]: originVerifyValue,
      },
    });

    // Bearer forwarding under real no-cache (AWS constraint):
    // - Custom CachePolicy cannot combine HeaderBehavior(Authorization) with
    //   all TTLs = 0 ("HeaderBehavior is invalid for policy with caching
    //   disabled").
    // - Custom OriginRequestPolicy cannot whitelist Authorization alone
    //   (CDK/CloudFront reject it; Authorization belongs in the cache key
    //   when caching is on).
    // - When caching is fully off, AWS's documented path is managed
    //   CACHING_DISABLED + ALL_VIEWER_EXCEPT_HOST_HEADER, which forwards
    //   Authorization without putting it in a cache key. Host stays the
    //   Function URL hostname; `toWebRequest` restamps the public Host.
    // Do not "fix" with maxTtl: 1 — that reintroduces an auth-keyed cache
    // window MCP must not have.
    const restoreWwwAuthenticateFn = new cloudfront.Function(
      this,
      "RestoreWwwAuthenticateFn",
      {
        comment: "Restore WWW-Authenticate remapped by Lambda Function URLs",
        runtime: cloudfront.FunctionRuntime.JS_2_0,
        code: cloudfront.FunctionCode.fromInline(restoreWwwAuthenticateFunctionCode()),
      },
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        functionAssociations: [
          {
            function: restoreWwwAuthenticateFn,
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          },
        ],
      },
      domainNames: [mcpHostname],
      certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    aliasToCloudFront(this, hostedZone, distribution, "McpAlias", "mcp");

    new cdk.CfnOutput(this, "ServerUrl", { value: serverUrl });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "N8nClientId", { value: n8nClient.userPoolClientId });
    new cdk.CfnOutput(this, "TokenEndpoint", {
      value: `${domain.baseUrl()}/oauth2/token`,
    });
  }
}
