import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as route53 from "aws-cdk-lib/aws-route53";
import { describe, expect, it } from "vitest";
import type { InfraConfig } from "../config";
import { CertStack } from "./cert-stack";

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
};

function synth(): Template {
  const app = new cdk.App();
  const deps = new cdk.Stack(app, "Deps", {
    env: { account: "123456789012", region: "us-east-1" },
  });
  const hostedZone = new route53.HostedZone(deps, "Zone", {
    zoneName: baseConfig.domainName,
  });
  const stack = new CertStack(app, "Cert", {
    env: { account: "123456789012", region: "us-east-1" },
    config: baseConfig,
    hostedZone,
  });
  return Template.fromStack(stack);
}

describe("CertStack", () => {
  it("retains superseded ACM certs on replacement so CloudFront cutover cannot deadlock cleanup", () => {
    const template = synth();
    template.hasResource("AWS::CertificateManager::Certificate", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });
  });

  it("covers mcp subdomain for candidate-mcp CloudFront", () => {
    const template = synth();
    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: baseConfig.domainName,
      SubjectAlternativeNames: Match.arrayWith([`mcp.${baseConfig.domainName}`]),
    });
  });
});
