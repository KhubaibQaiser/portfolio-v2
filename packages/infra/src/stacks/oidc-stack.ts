import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { ssmPaths as deploySsmPaths } from "@portfolio/deploy/ssm-paths";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";

export type OidcStackProps = cdk.StackProps & {
  config: InfraConfig;
};

const GITHUB_OIDC_URL = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUD = "sts.amazonaws.com";

/**
 * GitHub Actions OIDC deploy role. CI authenticates with GitHub's OIDC token
 * (no long-lived keys) and assumes this role to run `cdk deploy`.
 *
 * Least privilege for deploy: the role assumes CDK bootstrap roles (`cdk-*`) for
 * `cdk deploy`, plus scoped read access for the OpenNext build and post-deploy
 * smoke test (SSM registry, Web stack output, media bucket listing).
 *
 * The trust policy is pinned to the configured repo's `main` branch and a
 * `production` GitHub Environment so PR/fork runs cannot assume it.
 */
export class OidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OidcStackProps) {
    super(scope, id, props);
    const { config } = props;
    const repo = config.githubRepo;
    if (!repo) {
      throw new Error(
        "OidcStack requires config.githubRepo (set -c githubRepo=owner/name).",
      );
    }

    const provider = config.githubOidcProviderArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          "GitHubOidc",
          config.githubOidcProviderArn,
        )
      : new iam.OpenIdConnectProvider(this, "GitHubOidc", {
          url: GITHUB_OIDC_URL,
          clientIds: [GITHUB_OIDC_AUD],
        });

    const role = new iam.Role(this, "DeployRole", {
      roleName: `${config.appName}-gha-deploy`,
      description: "Assumed by GitHub Actions (OIDC) to run cdk deploy",
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.OpenIdConnectPrincipal(provider, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": GITHUB_OIDC_AUD,
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": [
            `repo:${repo}:ref:refs/heads/main`,
            `repo:${repo}:environment:production`,
          ],
        },
      }),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );

    const registryPaths = deploySsmPaths(config.appName);
    const registryParamArn = (suffix: string) =>
      `arn:aws:ssm:${this.region}:${this.account}:parameter${suffix}`;

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadDeployRegistryFromSsm",
        actions: ["ssm:GetParameter"],
        resources: [
          registryParamArn(registryPaths.mediaPublicBaseUrl),
          registryParamArn(registryPaths.mediaBucketName),
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadWebStackOutputs",
        actions: ["cloudformation:DescribeStacks"],
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/${config.appName}-Web/*`,
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/${config.appName}-CandidateMcp/*`,
        ],
      }),
    );

    // Read-only access for the post-deploy candidate-mcp smoke test bearer.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadCandidateMcpSmokeTestSecret",
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:/${config.appName.toLowerCase()}/candidate-mcp/smoke-test-key-*`,
        ],
      }),
    );

    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this,
      registryPaths.mediaBucketName,
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ListMediaForSmokeTest",
        actions: ["s3:ListBucket"],
        resources: [`arn:aws:s3:::${mediaBucketName}`],
        conditions: {
          StringLike: { "s3:prefix": ["media/*"] },
        },
      }),
    );

    new cdk.CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
