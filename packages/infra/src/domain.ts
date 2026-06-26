import * as acm from "aws-cdk-lib/aws-certificatemanager";
import type * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import type { InfraConfig } from "./config";
import { ssmPaths } from "./naming";

/**
 * Route 53 hosted zone discovered from the SSM registry (published by the Dns
 * stack). No cross-stack construct import — see docs/adr/0001.
 */
export function resolveHostedZone(scope: Construct, config: InfraConfig): route53.IHostedZone {
  return route53.HostedZone.fromHostedZoneAttributes(scope, "HostedZone", {
    hostedZoneId: ssm.StringParameter.valueForStringParameter(
      scope,
      ssmPaths(config).hostedZoneId,
    ),
    zoneName: config.domainName,
  });
}

/**
 * CloudFront TLS certificate (us-east-1 ACM) discovered from the SSM registry
 * (published by the Cert stack when `-c domainEnabled=true`).
 */
export function resolveSiteCertificate(scope: Construct, config: InfraConfig): acm.ICertificate {
  return acm.Certificate.fromCertificateArn(
    scope,
    "SiteCertificate",
    ssm.StringParameter.valueForStringParameter(scope, ssmPaths(config).certificateArn),
  );
}

/** Route 53 alias A record pointing a name (or the zone apex) at CloudFront. */
export function aliasToCloudFront(
  scope: Construct,
  zone: route53.IHostedZone,
  distribution: cloudfront.IDistribution,
  id: string,
  recordName?: string,
): void {
  new route53.ARecord(scope, id, {
    zone,
    ...(recordName ? { recordName } : {}),
    target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
  });
}
