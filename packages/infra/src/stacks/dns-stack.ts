import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { googleSiteVerificationTxtValue } from "../dns/google-site-verification";

export type DnsStackProps = cdk.StackProps & {
  config: InfraConfig;
};

/**
 * The public hosted zone for the apex domain. Deployed first and in isolation:
 * its output nameservers must be delegated at the registrar (Namecheap) before
 * the ACM certificate can be DNS-validated. Route 53 is a global service, so
 * the stack's region is immaterial — it lives in us-east-1 alongside the cert.
 *
 * `hostedZone` is passed directly (as a construct, not via SSM) to the Cert
 * (same-region) and Web/Admin/Storybook (cross-region) stacks — see
 * docs/adr/0001-cross-stack-references.md. `crossRegionReferences: true` must
 * be set on this stack *and* every cross-region consumer for that to work;
 * CloudFormation dynamic references (`{{resolve:ssm:...}}`) cannot cross
 * regions, which is why an SSM-registry handle doesn't work here.
 */
export class DnsStack extends cdk.Stack {
  readonly hostedZone: route53.PublicHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.hostedZone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: props.config.domainName,
    });

    if (props.config.googleDnsSiteVerification) {
      new route53.TxtRecord(this, "GoogleSiteVerification", {
        zone: this.hostedZone,
        values: [googleSiteVerificationTxtValue(props.config.googleDnsSiteVerification)],
        comment: "Google Search Console domain verification",
      });
    }

    new cdk.CfnOutput(this, "HostedZoneId", {
      value: this.hostedZone.hostedZoneId,
    });
    new cdk.CfnOutput(this, "NameServers", {
      description: "Set these as the custom nameservers at your registrar",
      value: cdk.Fn.join(", ", this.hostedZone.hostedZoneNameServers ?? []),
    });
  }
}
