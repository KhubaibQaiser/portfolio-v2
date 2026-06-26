import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import { StaticSite } from "../constructs/static-site";
import type { InfraConfig } from "../config";
import { aliasToCloudFront, resolveHostedZone, resolveSiteCertificate } from "../domain";

export type StorybookStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to packages/ui/storybook-static (the `storybook build` output). */
  assetDir: string;
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
      ...(config.domainEnabled
        ? {
            domain: {
              domainNames: [`storybook.${config.domainName}`],
              certificate: resolveSiteCertificate(this, config),
            },
          }
        : {}),
    });

    if (config.domainEnabled) {
      const zone = resolveHostedZone(this, config);
      aliasToCloudFront(this, zone, site.distribution, "StorybookAlias", "storybook");
    }

    new cdk.CfnOutput(this, "StorybookUrl", {
      value: config.domainEnabled
        ? `https://storybook.${config.domainName}`
        : `https://${site.distribution.distributionDomainName}`,
    });
  }
}
