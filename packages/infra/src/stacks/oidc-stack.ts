import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
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
 * Least privilege: rather than granting broad service permissions, the role is
 * only allowed to assume the CDK bootstrap roles (`cdk-*`). CloudFormation then
 * executes changes via the bootstrap CFN execution role, so the actual deploy
 * permissions live with the bootstrap stack — the standard modern pattern.
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

    // Only allow assuming the CDK bootstrap roles in this account.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );

    new cdk.CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
