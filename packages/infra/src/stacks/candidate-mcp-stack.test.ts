import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
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

/**
 * Builds and synthesizes `CandidateMcpStack` in isolation, with plain
 * (non-DNS-validated) hosted-zone/certificate constructs standing in for the
 * real Dns/Cert stacks — this test never touches AWS. Real bundling of
 * `apps/candidate-mcp/src/lambda.ts` still runs (esbuild via `NodejsFunction`),
 * so a broken import graph in the app fails this test, not just a deploy.
 */
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
  it("provisions a client-credentials-only Cognito resource server and app client", () => {
    const template = synth();

    template.hasResourceProperties("AWS::Cognito::UserPoolResourceServer", {
      Identifier: "https://mcp.khubaibqaiser.com",
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: "profile.read" })]),
    });

    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: true,
      AllowedOAuthFlows: ["client_credentials"],
      AllowedOAuthFlowsUserPoolClient: true,
    });
    // The scope string is built from the resource-server identifier, which
    // is itself a token at synth time — just assert exactly one scope is
    // wired up (the CFN intrinsic shape is an implementation detail).
    const [client] = Object.values(
      template.findResources("AWS::Cognito::UserPoolClient"),
    );
    expect(client).toBeDefined();
    expect(client?.Properties.AllowedOAuthScopes).toHaveLength(1);
  });

  it("writes the app client's secret into Secrets Manager, never a CfnOutput", () => {
    const template = synth();

    template.resourceCountIs("AWS::SecretsManager::Secret", 2);

    // The n8n client secret must be a CloudFormation dynamic reference resolved
    // via a `Fn::GetAtt` onto the UserPoolClient's `ClientSecret` attribute
    // (CDK provisions a custom resource to fetch it), never a plaintext
    // string baked into the template — otherwise the actual client secret
    // would be sitting in source-controllable, human-readable CFN output,
    // which is exactly what "no secrets in source" forbids.
    const secrets = Object.values(template.findResources("AWS::SecretsManager::Secret"));
    const n8nSecret = secrets.find((secret) =>
      JSON.stringify(secret.Properties.SecretString ?? "").includes(
        "UserPoolClient.ClientSecret",
      ),
    );
    expect(n8nSecret).toBeDefined();
    const serialized = JSON.stringify(n8nSecret?.Properties.SecretString);
    expect(serialized).toContain("Fn::Join");
    expect(serialized).toContain("UserPoolClient.ClientSecret");

    const outputs = template.toJSON().Outputs ?? {};
    for (const output of Object.values(outputs) as Array<{ Value?: unknown }>) {
      expect(JSON.stringify(output.Value ?? "")).not.toMatch(/clientSecret/i);
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

  it("forwards Authorization via a zero-TTL cache policy and restores WWW-Authenticate on the way out", () => {
    const template = synth();

    template.hasResourceProperties("AWS::CloudFront::CachePolicy", {
      CachePolicyConfig: Match.objectLike({
        DefaultTTL: 0,
        MaxTTL: 0,
        MinTTL: 0,
        ParametersInCacheKeyAndForwardedToOrigin: Match.objectLike({
          HeadersConfig: Match.objectLike({
            HeaderBehavior: "whitelist",
            Headers: ["Authorization"],
          }),
        }),
      }),
    });

    template.hasResourceProperties("AWS::CloudFront::OriginRequestPolicy", {
      OriginRequestPolicyConfig: Match.objectLike({
        CookiesConfig: { CookieBehavior: "none" },
        HeadersConfig: Match.objectLike({
          HeaderBehavior: "whitelist",
          Headers: Match.arrayEquals([
            "Accept",
            "Content-Type",
            "Last-Event-ID",
            "MCP-Protocol-Version",
            "MCP-Session-Id",
            "Origin",
          ]),
        }),
      }),
    });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          FunctionAssociations: Match.arrayWith([
            Match.objectLike({ EventType: "viewer-response" }),
          ]),
        }),
      }),
    });
  });

  it("grants DynamoDB access scoped to exactly the five content tables read by its tools, not the whole table set", () => {
    const template = synth();

    const policies = Object.values(template.findResources("AWS::IAM::Policy"));
    const statements = policies.flatMap(
      (policy) =>
        policy.Properties.PolicyDocument.Statement as Array<Record<string, unknown>>,
    );

    const readStatement = statements.find((s) => s.Sid === "CandidateProfileContentRead");
    expect(readStatement).toBeDefined();
    expect(readStatement?.Action).toEqual(
      expect.arrayContaining([
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable",
      ]),
    );
    // Least privilege: no write actions and no blanket wildcard resource.
    expect(readStatement?.Action).not.toContain("dynamodb:PutItem");
    expect(readStatement?.Action).not.toContain("dynamodb:DeleteItem");

    const readResources = JSON.stringify(readStatement?.Resource ?? []);
    for (const table of ["content", "experience", "project", "skill", "testimonial"]) {
      expect(readResources).toContain(`portfolio-${table}`);
    }
    for (const table of ["resume-generation", "media", "chat-cache"]) {
      expect(readResources).not.toContain(`portfolio-${table}`);
    }

    const rateLimitStatement = statements.find(
      (s) => s.Sid === "CandidateMcpRateLimitCounter",
    );
    expect(rateLimitStatement).toBeDefined();
    expect(rateLimitStatement?.Action).toBe("dynamodb:UpdateItem");
    expect(JSON.stringify(rateLimitStatement?.Resource)).toContain(
      "portfolio-rate-limit",
    );
  });
});
