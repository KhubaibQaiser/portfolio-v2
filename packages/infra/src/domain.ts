import type * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";

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
