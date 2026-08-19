import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import type * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";

export type CertStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Hosted zone from the Dns stack (same-region construct reference). */
  hostedZone: route53.IHostedZone;
};

/**
 * The CloudFront TLS certificate. Must live in us-east-1 regardless of where
 * the app runs, because CloudFront only reads ACM certs from that region.
 * Covers the apex plus the `www`, `admin`, `storybook`, and `mcp` subdomains
 * and is DNS-validated against the hosted zone (requires registrar
 * delegation to be complete).
 *
 * `certificate` is passed directly (as a construct) to the
 * Web/Admin/Storybook/CandidateMcp stacks in eu-west-1 — see
 * docs/adr/0001-cross-stack-references.md. Requires
 * `crossRegionReferences: true` on this stack and every consumer.
 */
export class CertStack extends cdk.Stack {
  readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, props);
    const { config, hostedZone } = props;
    const { domainName } = config;

    this.certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName,
      subjectAlternativeNames: [
        `www.${domainName}`,
        `admin.${domainName}`,
        `storybook.${domainName}`,
        `mcp.${domainName}`,
      ],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
    // SAN changes replace the physical cert. Retain the superseded ACM cert
    // during cleanup so a deploy cannot deadlock while CloudFront distributions
    // (eu-west-1) still reference the old ARN — they pick up the new cert on
    // their own stack update, after which the retained cert can be deleted
    // manually from ACM if desired.
    this.certificate.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    new cdk.CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
    });
  }
}
