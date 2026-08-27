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
import { restoreWwwAuthenticateFunctionCode } from "../cloudfront/restore-www-authenticate";
import type { InfraConfig } from "../config";
import { aliasToCloudFront } from "../domain";
import { appErrorMetric, grantCandidateMcpDataAccess } from "../naming";

/** Must match `ORIGIN_VERIFY_HEADER` in apps/candidate-mcp/src/origin-verify.ts. */
const ORIGIN_VERIFY_HEADER = "x-origin-verify";

/** Claude.ai / Claude.com MCP OAuth callback URLs (pre-registered fallback client). */
const CLAUDE_CALLBACK_URLS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
] as const;

export type CandidateMcpStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to `apps/candidate-mcp/src/lambda.ts`. */
  entry: string;
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
};

/**
 * Candidate-profile MCP server: OAuth 2.1 resource server (Cognito AS) behind
 * CloudFront on `mcp.<domain>`. See ADR 0003 and ADR 0006.
 */
export class CandidateMcpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CandidateMcpStackProps) {
    super(scope, id, props);
    const { config, hostedZone, certificate } = props;

    const mcpHostname = `mcp.${config.domainName}`;
    const serverUrl = `https://${mcpHostname}/mcp`;
    const resourceServerIdentifier = `https://${mcpHostname}`;

    const userPool = new cognito.UserPool(this, "AgentPool", {
      userPoolName: `${config.appName}-candidate-mcp-agents`,
      selfSignUpEnabled: false,
      featurePlan: cognito.FeaturePlan.LITE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

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

    const resourceScope = cognito.OAuthScope.resourceServer(
      resourceServer,
      profileReadScope,
    );

    // M2M: n8n + CI smoke (client_credentials). Secret lives in SM only.
    const n8nClient = userPool.addClient("N8nWorkflowClient", {
      userPoolClientName: "n8n-workflow",
      generateSecret: true,
      authFlows: {},
      oAuth: {
        flows: { clientCredentials: true },
        scopes: [resourceScope],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      preventUserExistenceErrors: true,
    });

    new secretsmanager.Secret(this, "N8nWorkflowClientSecret", {
      secretName: `/${config.appName.toLowerCase()}/candidate-mcp/n8n-workflow-client`,
      description:
        "Cognito client_id/client_secret for n8n and smoke-test client-credentials against candidate-mcp",
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

    // Interactive: Claude / Inspector fallback when DCR is unused.
    const claudeClient = userPool.addClient("ClaudeAiClient", {
      userPoolClientName: "claude-ai",
      generateSecret: false,
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          resourceScope,
        ],
        callbackUrls: [...CLAUDE_CALLBACK_URLS],
        logoutUrls: ["https://claude.ai/", "https://claude.com/"],
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      accessTokenValidity: cdk.Duration.hours(1),
      preventUserExistenceErrors: true,
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
        MCP_RESOURCE_SERVER_IDENTIFIER: resourceServerIdentifier,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_REGION: config.region,
        COGNITO_DOMAIN: domain.domainName,
        MCP_ENABLED: "true",
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });
    grantCandidateMcpDataAccess(this, serverFunction, config);

    // DCR adapter: CreateUserPoolClient for allowlisted public PKCE clients.
    serverFunction.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "CandidateMcpDcrCreateClient",
        actions: ["cognito-idp:CreateUserPoolClient"],
        resources: [userPool.userPoolArn],
      }),
    );

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

    const functionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const origin = new origins.FunctionUrlOrigin(functionUrl, {
      customHeaders: {
        [ORIGIN_VERIFY_HEADER]: originVerifyValue,
      },
    });

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
    new cdk.CfnOutput(this, "ClaudeClientId", {
      value: claudeClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "TokenEndpoint", {
      value: `${domain.baseUrl()}/oauth2/token`,
    });
    new cdk.CfnOutput(this, "AuthorizeEndpoint", {
      value: `${domain.baseUrl()}/oauth2/authorize`,
    });
  }
}
