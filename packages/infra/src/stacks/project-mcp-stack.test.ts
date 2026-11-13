import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { describe, expect, it } from "vitest";
import type { InfraConfig } from "../config";
import { ProjectMcpStack } from "./project-mcp-stack";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const entry = path.join(repoRoot, "apps/project-mcp/src/lambda.ts");

const config: InfraConfig = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "example.com",
  domainEnabled: true,
  tablePrefix: "portfolio",
  mediaCorsOrigins: [],
  adminUrls: [],
  adminAllowedEmails: [],
  monthlyBudgetUsd: 25,
  mcpCognitoDomainPrefix: "example-com-candidate-mcp",
};

function synth(): Template {
  const app = new cdk.App();
  const deps = new cdk.Stack(app, "Deps", {
    env: { account: "123456789012", region: "eu-west-1" },
  });
  const hostedZone = new route53.HostedZone(deps, "Zone", {
    zoneName: config.domainName,
  });
  const certificate = new acm.Certificate(deps, "Cert", {
    domainName: config.domainName,
    subjectAlternativeNames: [`mcp-write.${config.domainName}`],
    validation: acm.CertificateValidation.fromDns(hostedZone),
  });
  const stack = new ProjectMcpStack(app, "ProjectMcp", {
    env: { account: "123456789012", region: "eu-west-1" },
    config,
    entry,
    hostedZone,
    certificate,
  });
  return Template.fromStack(stack);
}

function statements(template: Template): Array<Record<string, unknown>> {
  return Object.values(template.findResources("AWS::IAM::Policy")).flatMap(
    (policy) =>
      policy.Properties.PolicyDocument.Statement as Array<Record<string, unknown>>,
  );
}

describe("ProjectMcpStack", () => {
  it("has its own pool with only the projects.write scope and no M2M client", () => {
    const template = synth();
    template.resourceCountIs("AWS::Cognito::UserPool", 1);
    template.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
    template.hasResourceProperties("AWS::Cognito::UserPoolResourceServer", {
      Identifier: "https://mcp-write.example.com",
      Scopes: [Match.objectLike({ ScopeName: "projects.write" })],
    });
    expect(
      JSON.stringify(template.findResources("AWS::Cognito::UserPoolClient")),
    ).not.toContain("client_credentials");
    template.resourceCountIs("AWS::SecretsManager::Secret", 1); // origin-verify only
  });

  it("limits DynamoDB writes to PutItem on the project table, nothing destructive", () => {
    const stmts = statements(synth());

    const write = stmts.find((s) => s.Sid === "ProjectMcpProjectWrite");
    expect(write).toBeDefined();
    expect(write?.Action).toContain("dynamodb:PutItem");
    const resources = JSON.stringify(write?.Resource);
    expect(resources).toContain("portfolio-project");
    for (const other of [
      "content",
      "experience",
      "skill",
      "testimonial",
      "job-posting",
      "media",
    ]) {
      expect(resources).not.toContain(`portfolio-${other}`);
    }
    expect(resources).not.toContain("portfolio-*");

    const allActions = JSON.stringify(stmts.map((s) => s.Action));
    for (const forbidden of ["DeleteItem", "BatchWriteItem", "dynamodb:*"]) {
      expect(allActions).not.toContain(forbidden);
    }
    // UpdateItem exists only for the rate-limit counter.
    const updaters = stmts.filter((s) => JSON.stringify(s.Action).includes("UpdateItem"));
    expect(updaters.map((s) => s.Sid)).toEqual(["ProjectMcpRateLimitCounter"]);
  });

  it("keeps the Function URL behind origin-verify, with the secret never in an output", () => {
    const template = synth();
    template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "NONE" });
    template.resourceCountIs("AWS::CloudFront::OriginAccessControl", 0);
    for (const output of Object.values(template.toJSON().Outputs ?? {}) as Array<{
      Value?: unknown;
    }>) {
      expect(JSON.stringify(output.Value ?? "")).not.toMatch(/origin-verify|secret/i);
    }
  });

  it("serves mcp-write.<domain>, does not reserve concurrency, and passes media/admin env", () => {
    const template = synth();
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({ Aliases: ["mcp-write.example.com"] }),
    });
    template.hasResourceProperties("AWS::Lambda::Function", {
      ReservedConcurrentExecutions: Match.absent(),
    });
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          MCP_SERVER_URL: "https://mcp-write.example.com/mcp",
          MCP_RESOURCE_SERVER_IDENTIFIER: "https://mcp-write.example.com",
          ADMIN_URL: "https://admin.example.com",
          MEDIA_PUBLIC_BASE_URL: Match.anyValue(),
        }),
      }),
    });
  });
});
