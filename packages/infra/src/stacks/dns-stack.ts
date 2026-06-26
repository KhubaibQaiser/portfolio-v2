import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { ssmPaths } from "../naming";

export type DnsStackProps = cdk.StackProps & {
  config: InfraConfig;
};

/**
 * The public hosted zone for the apex domain. Deployed first and in isolation:
 * its output nameservers must be delegated at the registrar (Namecheap) before
 * the ACM certificate can be DNS-validated. Route 53 is a global service, so
 * the stack's region is immaterial — it is colocated in us-east-1 with the cert
 * to keep the cert/zone reference same-region.
 */
export class DnsStack extends cdk.Stack {
  readonly hostedZone: route53.PublicHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.hostedZone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: props.config.domainName,
    });

    new cdk.CfnOutput(this, "HostedZoneId", {
      value: this.hostedZone.hostedZoneId,
    });
    new cdk.CfnOutput(this, "NameServers", {
      description: "Set these as the custom nameservers at your registrar",
      value: cdk.Fn.join(", ", this.hostedZone.hostedZoneNameServers ?? []),
    });

    // Publish the zone id to the SSM registry so Cert/Web/Admin stacks can
    // create validation records and aliases without importing this stack.
    new ssm.StringParameter(this, "HostedZoneIdParam", {
      parameterName: ssmPaths(props.config).hostedZoneId,
      stringValue: this.hostedZone.hostedZoneId,
    });
  }
}
