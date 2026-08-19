import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
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
      // Caps simultaneous executions (cost + abuse control, ADR 0002) — this
      // server has no production consumers yet, so a small, explicit ceiling
      // is far cheaper than the account's default unreserved pool.
      reservedConcurrentExecutions: config.mcpReservedConcurrency,
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

    const errorMetric = appErrorMetric(config);
    new logs.MetricFilter(this, "AppErrorMetric", {
      logGroup,
      metricNamespace: errorMetric.namespace,
      metricName: errorMetric.metricName,
      filterPattern: logs.FilterPattern.stringValue("$.level", "=", "ERROR"),
      metricValue: "1",
      defaultValue: 0,
    });

    // --- Network: Function URL behind CloudFront, IAM/SigV4-gated so the
    // Function URL itself is unreachable except via this distribution's OAC
    // (defense in depth: this is *in addition to*, not instead of, the
    // application-level OAuth bearer check every MCP request also goes
    // through — see `http-handler.ts`). ---
    const functionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });
    const origin = origins.FunctionUrlOrigin.withOriginAccessControl(functionUrl);

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

    serverFunction.addPermission("AllowCloudFrontInvokeUrl", {
      principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
      action: "lambda:InvokeFunctionUrl",
      sourceArn: distribution.distributionArn,
    });
    serverFunction.addPermission("AllowCloudFrontInvoke", {
      principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: distribution.distributionArn,
      invokedViaFunctionUrl: true,
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
