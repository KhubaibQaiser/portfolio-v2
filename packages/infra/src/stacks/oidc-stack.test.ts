import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import type { InfraConfig } from "../config";
import { OidcStack } from "./oidc-stack";

const baseConfig: InfraConfig = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "example.com",
  domainEnabled: false,
  tablePrefix: "portfolio",
  mediaCorsOrigins: [],
  adminUrls: [],
  adminAllowedEmails: [],
  monthlyBudgetUsd: 25,
  githubRepo: "KhubaibQaiser/portfolio-v2",
  mcpCognitoDomainPrefix: "example-com-candidate-mcp",
};

function synth(): Template {
  const app = new cdk.App();
  const stack = new OidcStack(app, "Portfolio-Oidc", {
    env: { account: "123456789012", region: "eu-west-1" },
    config: baseConfig,
  });
  return Template.fromStack(stack);
}

describe("OidcStack deploy role", () => {
  it("can read content tables for the web prerender and cannot write them", () => {
    const template = synth();
    const policies = template.findResources("AWS::IAM::Policy");
    const document = JSON.stringify(policies);

    expect(document).toContain("dynamodb:GetItem");
    expect(document).toContain("dynamodb:BatchGetItem");
    expect(document).toContain("dynamodb:Query");
    expect(document).toContain("dynamodb:Scan");
    expect(document).toContain("dynamodb:DescribeTable");
    expect(document).toContain(
      "arn:aws:dynamodb:eu-west-1:123456789012:table/portfolio-*",
    );
    expect(document).toContain(
      "arn:aws:dynamodb:eu-west-1:123456789012:table/portfolio-*/index/*",
    );
    expect(document).not.toContain("dynamodb:PutItem");
    expect(document).not.toContain("dynamodb:UpdateItem");
    expect(document).not.toContain("dynamodb:DeleteItem");
  });
});
