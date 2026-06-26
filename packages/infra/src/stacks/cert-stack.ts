import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { resolveHostedZone } from "../domain";
import { ssmPaths } from "../naming";

export type CertStackProps = cdk.StackProps & {
  config: InfraConfig;
};

/**
 * The CloudFront TLS certificate. Must live in us-east-1 regardless of where
 * the app runs, because CloudFront only reads ACM certs from that region.
 * Covers the apex plus the `www`, `admin`, and `storybook` subdomains and is
 * DNS-validated against the hosted zone (requires registrar delegation to be
 * complete).
 *
 * The zone is discovered from the SSM registry (not a cross-stack import) and
 * the issued cert ARN is published back to SSM for the Web/Admin/Storybook stacks.
 */
export class CertStack extends cdk.Stack {
  readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, props);
    const { config } = props;
    const { domainName } = config;

    const hostedZone = resolveHostedZone(this, config);

    this.certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName,
      subjectAlternativeNames: [
        `www.${domainName}`,
        `admin.${domainName}`,
        `storybook.${domainName}`,
      ],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    new ssm.StringParameter(this, "CertificateArnParam", {
      parameterName: ssmPaths(config).certificateArn,
      stringValue: this.certificate.certificateArn,
    });

    new cdk.CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
    });
  }
}
