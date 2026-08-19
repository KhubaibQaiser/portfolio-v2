import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";
import type { InfraConfig } from "../config";
import { OidcStack } from "./oidc-stack";

const baseConfig: InfraConfig = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "khubaibqaiser.com",
  domainEnabled: true,
  tablePrefix: "portfolio",
  mediaCorsOrigins: [],
  adminUrls: [],
  adminAllowedEmails: [],
  monthlyBudgetUsd: 25,
  mcpCognitoDomainPrefix: "khubaibqaiser-com-candidate-mcp",
  mcpReservedConcurrency: 5,
  githubRepo: "KhubaibQaiser/portfolio-v2",
};

function synth(): Template {
  const app = new cdk.App();
  const stack = new OidcStack(app, "Oidc", {
    env: { account: "123456789012", region: "eu-west-1" },
    config: baseConfig,
  });
  return Template.fromStack(stack);
}

describe("OidcStack", () => {
  it("lets gha-deploy read Portfolio-Cert in us-east-1 for cert recovery sync", () => {
    const template = synth();
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "CertRecoveryReadCertStack",
            Action: "cloudformation:DescribeStacks",
            Resource: "arn:aws:cloudformation:us-east-1:123456789012:stack/Portfolio-Cert/*",
          }),
        ]),
      },
    });
  });

  it("lets gha-deploy sync CDK cross-region cert exports for consumer CloudFront stacks", () => {
    const template = synth();
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "CertRecoverySyncCrossRegionExports",
            Action: Match.arrayWith([
              "ssm:GetParameter",
              "ssm:GetParametersByPath",
              "ssm:PutParameter",
            ]),
            Resource: Match.arrayWith([
              "arn:aws:ssm:eu-west-1:123456789012:parameter/cdk/exports/Portfolio-Web/*",
              "arn:aws:ssm:eu-west-1:123456789012:parameter/cdk/exports/Portfolio-Admin/*",
              "arn:aws:ssm:eu-west-1:123456789012:parameter/cdk/exports/Portfolio-Storybook/*",
            ]),
          }),
        ]),
      },
    });
  });
});
