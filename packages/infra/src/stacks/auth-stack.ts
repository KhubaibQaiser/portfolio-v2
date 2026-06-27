import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { ssmPaths } from "../naming";

export type AuthStackProps = cdk.StackProps & {
  config: InfraConfig;
};

// SSM parameter names the Google OAuth credentials are read from when
// `googleAuthEnabled` is set. Populate these manually before enabling Google
// federation. Both are plain `String` params (NOT SecureString): Cognito's
// UserPoolIdentityProvider rejects `ssm-secure` dynamic references for
// client_secret, so the secret is referenced as a non-secure SSM string.
const GOOGLE_CLIENT_ID_PARAM = "/portfolio/google/client-id";
const GOOGLE_CLIENT_SECRET_PARAM = "/portfolio/google/client-secret";

const lambdaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../lambda");

/**
 * Authentication stack: a Cognito user pool for the admin dashboard with the
 * Hosted UI, an optional Google identity provider, and a V1 pre-token-
 * generation Lambda that stamps a `role` claim onto issued ID tokens.
 *
 * Self sign-up is disabled — operators are created explicitly and the admin
 * email allowlist is the authoritative gate in-app. The app verifies tokens
 * with `aws-jwt-verify` using the exported pool/client ids.
 */
export class AuthStack extends cdk.Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  /** Hosted UI base URL (`https://<prefix>.auth.<region>.amazoncognito.com`). */
  readonly hostedUiDomain: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    const { config } = props;

    const preTokenFn = new lambda.Function(this, "PreTokenFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(lambdaDir, "pre-token")),
      timeout: cdk.Duration.seconds(5),
      // Bounded retention so log storage never accrues indefinitely (ADR 0002).
      logGroup: new logs.LogGroup(this, "PreTokenFnLogs", {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${config.appName}-admin`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      autoVerify: { email: true },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: { preTokenGeneration: preTokenFn },
      // Deliberate exception to the "only DynamoDB tables + S3 buckets survive a
      // teardown" rule: the pool holds identity state (admin users + MFA
      // enrollments) with no fixture/re-seed story, so it's as precious as the
      // content data. Everything else in this stack is DESTROY.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const supportedIdps = [cognito.UserPoolClientIdentityProvider.COGNITO];
    const identityProviders: cognito.IUserPoolIdentityProvider[] = [];

    if (config.googleAuthEnabled) {
      const google = new cognito.UserPoolIdentityProviderGoogle(this, "Google", {
        userPool: this.userPool,
        clientId: ssm.StringParameter.valueForStringParameter(
          this,
          GOOGLE_CLIENT_ID_PARAM,
        ),
        clientSecret: ssm.StringParameter.valueForStringParameter(
          this,
          GOOGLE_CLIENT_SECRET_PARAM,
        ),
        scopes: ["openid", "email", "profile"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        },
      });
      this.userPool.registerIdentityProvider(google);
      supportedIdps.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
      identityProviders.push(google);
    }

    this.userPoolClient = this.userPool.addClient("AdminClient", {
      userPoolClientName: `${config.appName}-admin`,
      generateSecret: false,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: supportedIdps,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: config.adminUrls.map((u) => `${u}/auth/callback`),
        logoutUrls: config.adminUrls,
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // The client lists these providers in `supportedIdentityProviders`, but CDK
    // does not infer the CloudFormation dependency — without this the client can
    // be updated before the IdP exists ("provider Google does not exist").
    for (const idp of identityProviders) {
      this.userPoolClient.node.addDependency(idp);
    }

    const domain = this.userPool.addDomain("HostedUi", {
      cognitoDomain: {
        domainPrefix: `${config.appName.toLowerCase()}-admin-${this.account}`,
      },
    });
    this.hostedUiDomain = domain.baseUrl();

    // Publish the generated ids to the SSM registry so the AdminStack can
    // discover them by path instead of importing a cross-stack export (which
    // would couple the two stacks and deadlock on replacement).
    const paths = ssmPaths(config);
    new ssm.StringParameter(this, "UserPoolIdParam", {
      parameterName: paths.authUserPoolId,
      stringValue: this.userPool.userPoolId,
    });
    new ssm.StringParameter(this, "UserPoolClientIdParam", {
      parameterName: paths.authUserPoolClientId,
      stringValue: this.userPoolClient.userPoolClientId,
    });
    new ssm.StringParameter(this, "HostedUiDomainParam", {
      parameterName: paths.authHostedUiDomain,
      stringValue: this.hostedUiDomain,
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "HostedUiUrl", {
      value: domain.baseUrl(),
    });
  }
}
