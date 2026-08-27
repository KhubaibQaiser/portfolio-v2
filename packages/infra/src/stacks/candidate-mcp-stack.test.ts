import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import { describe, expect, it } from "vitest";
import type { InfraConfig } from "../config";
import { CandidateMcpStack } from "./candidate-mcp-stack";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const entry = path.join(repoRoot, "apps/candidate-mcp/src/lambda.ts");

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
};

function synth(configOverrides: Partial<InfraConfig> = {}): Template {
  const app = new cdk.App();
  const deps = new cdk.Stack(app, "Deps", {
    env: { account: "123456789012", region: "eu-west-1" },
  });
  const hostedZone = new route53.HostedZone(deps, "Zone", {
    zoneName: baseConfig.domainName,
  });
  const certificate = new acm.Certificate(deps, "Cert", {
    domainName: baseConfig.domainName,
    subjectAlternativeNames: [`mcp.${baseConfig.domainName}`],
    validation: acm.CertificateValidation.fromDns(hostedZone),
  });

  const stack = new CandidateMcpStack(app, "CandidateMcp", {
    env: { account: "123456789012", region: "eu-west-1" },
    config: { ...baseConfig, ...configOverrides },
    entry,
    hostedZone,
    certificate,
  });

  return Template.fromStack(stack);
}

describe("CandidateMcpStack", () => {
  it("provisions Cognito user pool, resource server, and app clients (ADR 0006)", () => {
    const template = synth();
    template.resourceCountIs("AWS::Cognito::UserPool", 1);
    template.resourceCountIs("AWS::Cognito::UserPoolClient", 2);
    template.resourceCountIs("AWS::Cognito::UserPoolDomain", 1);
    template.resourceCountIs("AWS::Cognito::UserPoolResourceServer", 1);
  });

  it("stores the n8n/smoke client secret in Secrets Manager, never a CfnOutput", () => {
    const template = synth();

    const secrets = Object.values(template.findResources("AWS::SecretsManager::Secret"));
    const n8nSecret = secrets.find((secret) =>
      JSON.stringify(secret.Properties).includes("n8n-workflow-client"),
    );
    expect(n8nSecret).toBeDefined();

    const outputs = template.toJSON().Outputs ?? {};
    for (const output of Object.values(outputs) as Array<{ Value?: unknown }>) {
      expect(JSON.stringify(output.Value ?? "")).not.toMatch(/clientSecret|ClientSecret/i);
    }
  });

  it("does not put the origin-verify secret in a CfnOutput or as a plaintext origin header", () => {
    const template = synth();

    const outputs = template.toJSON().Outputs ?? {};
    for (const output of Object.values(outputs) as Array<{ Value?: unknown }>) {
      expect(JSON.stringify(output.Value ?? "")).not.toMatch(/origin-verify/i);
    }

    const [distribution] = Object.values(
      template.findResources("AWS::CloudFront::Distribution"),
    );
    const origins = distribution?.Properties.DistributionConfig.Origins as Array<{
      OriginCustomHeaders?: Array<{ HeaderName: string; HeaderValue: unknown }>;
    }>;
    const verifyHeader = origins
      ?.flatMap((origin) => origin.OriginCustomHeaders ?? [])
      .find((header) => header.HeaderName === "x-origin-verify");
    expect(verifyHeader).toBeDefined();
    const headerValue = JSON.stringify(verifyHeader?.HeaderValue ?? "");
    expect(headerValue).toMatch(/resolve:secretsmanager|Fn::|Ref/);
    expect(headerValue).not.toMatch(/^"[A-Za-z0-9]{48}"$/);

    const serverFn = Object.values(template.findResources("AWS::Lambda::Function")).find(
      (resource) => resource.Properties.Environment?.Variables?.ORIGIN_VERIFY_SECRET,
    );
    expect(serverFn).toBeDefined();
    const envValue = JSON.stringify(
      serverFn?.Properties.Environment.Variables.ORIGIN_VERIFY_SECRET,
    );
    expect(envValue).toMatch(/resolve:secretsmanager|Fn::|Ref/);
    expect(envValue).not.toMatch(/^"[A-Za-z0-9]{48}"$/);
  });

  it("leaves the Function URL public to CloudFront and locks it with origin-verify, not OAC SigV4", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "NONE",
    });
    template.resourceCountIs("AWS::CloudFront::OriginAccessControl", 0);
  });

  it("attaches RestoreWwwAuthenticate CloudFront Function on viewer-response", () => {
    const template = synth();
    template.resourceCountIs("AWS::CloudFront::Function", 1);
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          FunctionAssociations: Match.arrayWith([
            Match.objectLike({
              EventType: "viewer-response",
            }),
          ]),
        }),
      }),
    });
  });

  it("does not reserve Lambda concurrency (personal-account UnreservedConcurrentExecution floor)", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Lambda::Function", {
      ReservedConcurrentExecutions: Match.absent(),
    });
  });

  it("serves the custom domain over CloudFront with the shared certificate", () => {
    const template = synth();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: ["mcp.khubaibqaiser.com"],
      }),
    });
    template.resourceCountIs("AWS::Route53::RecordSet", 1);
  });

  it("uses managed no-cache + AllViewerExceptHostHeader so Authorization reaches the origin", () => {
    const template = synth();

    template.resourceCountIs("AWS::CloudFront::CachePolicy", 0);
    template.resourceCountIs("AWS::CloudFront::OriginRequestPolicy", 0);

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          CachePolicyId: cloudfront.CachePolicy.CACHING_DISABLED.cachePolicyId,
          OriginRequestPolicyId:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
              .originRequestPolicyId,
        }),
      }),
    });
  });

  it("grants DynamoDB content read, rate-limit UpdateItem, and DCR CreateUserPoolClient", () => {
    const template = synth();

    const policies = Object.values(template.findResources("AWS::IAM::Policy"));
    const statements = policies.flatMap(
      (policy) =>
        policy.Properties.PolicyDocument.Statement as Array<Record<string, unknown>>,
    );

    const readStatement = statements.find((s) => s.Sid === "CandidateProfileContentRead");
    expect(readStatement).toBeDefined();
    const readResources = JSON.stringify(readStatement?.Resource ?? []);
    for (const table of ["content", "experience", "project", "skill", "testimonial"]) {
      expect(readResources).toContain(`portfolio-${table}`);
    }

    expect(statements.find((s) => s.Sid === "CandidateMcpApiKeyVerify")).toBeUndefined();

    const rateLimitStatement = statements.find(
      (s) => s.Sid === "CandidateMcpRateLimitCounter",
    );
    expect(rateLimitStatement).toBeDefined();
    expect(rateLimitStatement?.Action).toBe("dynamodb:UpdateItem");

    const dcrStatement = statements.find((s) => s.Sid === "CandidateMcpDcrCreateClient");
    expect(dcrStatement).toBeDefined();
    expect(dcrStatement?.Action).toBe("cognito-idp:CreateUserPoolClient");
  });

  it("injects Cognito issuer env vars into the Lambda", () => {
    const template = synth();
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          COGNITO_USER_POOL_ID: Match.anyValue(),
          COGNITO_REGION: "eu-west-1",
          COGNITO_DOMAIN: Match.anyValue(),
          MCP_RESOURCE_SERVER_IDENTIFIER: "https://mcp.khubaibqaiser.com",
          MCP_SERVER_URL: "https://mcp.khubaibqaiser.com/mcp",
        }),
      }),
    });
  });
});
