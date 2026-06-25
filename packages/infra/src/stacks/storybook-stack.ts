import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import { StaticSite } from "../constructs/static-site";
import type { InfraConfig } from "../config";

export type StorybookStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Absolute path to packages/ui/storybook-static (the `storybook build` output). */
  assetDir: string;
};

/**
 * Storybook (design-system showcase) stack. Publishes the static Storybook
 * build via the {@link StaticSite} construct on its own CloudFront distribution.
 * Public on the default CloudFront domain until a custom subdomain is delegated.
 */
export class StorybookStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StorybookStackProps) {
    super(scope, id, props);

    new StaticSite(this, "Site", {
      assetDir: props.assetDir,
    });
  }
}
