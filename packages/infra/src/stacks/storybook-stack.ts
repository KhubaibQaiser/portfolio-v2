import * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import type * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import { StaticSite } from "../constructs/static-site";
import type { InfraConfig } from "../config";
import { aliasToCloudFront } from "../domain";

export type StorybookStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to packages/ui/storybook-static (the `storybook build` output). */
  assetDir: string;
  /** Dns/Cert stack constructs, only present when `config.domainEnabled`. */
  hostedZone?: route53.IHostedZone;
  certificate?: acm.ICertificate;
};

/**
 * Storybook (design-system showcase) stack. Publishes the static Storybook
 * build via the {@link StaticSite} construct on its own CloudFront distribution.
 * Public on the default CloudFront domain until `-c domainEnabled=true`
 * (`storybook.<domain>` + Route 53 alias).
 */
export class StorybookStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StorybookStackProps) {
    super(scope, id, props);
    const { config } = props;

    const site = new StaticSite(this, "Site", {
      assetDir: props.assetDir,
      ...(config.domainEnabled && props.certificate
        ? {
            domain: {
              domainNames: [`storybook.${config.domainName}`],
              certificate: props.certificate,
            },
          }
        : {}),
    });

    if (config.domainEnabled && props.hostedZone) {
      aliasToCloudFront(this, props.hostedZone, site.distribution, "StorybookAlias", "storybook");
    }

    new cdk.CfnOutput(this, "StorybookUrl", {
      value: config.domainEnabled
        ? `https://storybook.${config.domainName}`
        : `https://${site.distribution.distributionDomainName}`,
    });
  }
}
