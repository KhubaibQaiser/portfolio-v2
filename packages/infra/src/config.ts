import type { App } from "aws-cdk-lib";

/**
 * Resolved configuration shared across stacks. Values come from (in order):
 * CDK context (`-c key=value` or cdk.json) → environment → sane defaults.
 */
export type InfraConfig = {
  /** Target AWS account (from ambient CLI credentials when unset). */
  account?: string;
  /** Primary region for all regional resources. */
  region: string;
  /** Prefix for stack names and resource tags. */
  appName: string;
  /** Apex domain the site is served from. */
  domainName: string;
  /**
   * When false, sites deploy on their default `*.cloudfront.net` URLs and the
   * cert/DNS alias wiring is skipped. Flip to true (`-c domainEnabled=true`)
   * once the registrar nameservers have been delegated to Route 53.
   */
  domainEnabled: boolean;
  /** Physical DynamoDB single-table name (matches DYNAMO_TABLE_NAME). */
  tableName: string;
  /** Browser origins allowed to upload directly to the media bucket. */
  mediaCorsOrigins: string[];
  /**
   * Admin app origins used to build Cognito Hosted UI callback/logout URLs.
   * Always includes localhost for dev; pass the deployed admin origin via
   * `-c adminUrls=https://...` (csv) until the custom domain is delegated.
   */
  adminUrls: string[];
  /**
   * Enables the Google identity provider on the user pool. Requires the Google
   * OAuth client id/secret to exist in SSM (see GOOGLE_* param names). Off by
   * default so the pool deploys with email/password before Google is set up.
   */
  googleAuthEnabled: boolean;
  /**
   * Email subscribed to the SNS alerts topic (CloudWatch alarms, budgets).
   * Pass via `-c alertEmail=you@example.com`; the subscription requires a
   * one-time confirmation click. When unset, the topic has no subscribers.
   */
  alertEmail?: string;
  /**
   * Email identity verified in SES for the contact form (sender/recipient).
   * Pass via `-c contactEmail=you@example.com`; SES sends a one-time
   * verification email. Domain identity is deferred until DNS is delegated.
   */
  contactEmail?: string;
  /** Monthly cost budget (USD) that triggers SNS alerts at 80%/100%. */
  monthlyBudgetUsd: number;
  /**
   * GitHub repo (`owner/name`) allowed to assume the CI deploy role via OIDC.
   * Pass via `-c githubRepo=owner/name`; the OIDC stack is skipped when unset.
   */
  githubRepo?: string;
  /**
   * ARN of a pre-existing GitHub OIDC provider to reuse (only one is allowed
   * per account). When unset the stack creates the provider.
   */
  githubOidcProviderArn?: string;
};

const DEFAULTS = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "khubaibqaiser.com",
  tableName: "portfolio",
  adminDevUrl: "http://localhost:3001",
  monthlyBudgetUsd: 25,
} as const;

export function resolveConfig(app: App): InfraConfig {
  const ctx = (key: string): string | undefined => {
    const value = app.node.tryGetContext(key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  const corsRaw = ctx("mediaCorsOrigins");
  const csv = (raw: string | undefined): string[] =>
    raw
      ? raw
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

  const domainName = ctx("domainName") ?? DEFAULTS.domainName;
  const domainEnabled = ctx("domainEnabled") === "true";

  // localhost for dev + the custom admin subdomain once delegated + any extra
  // deployed origins (e.g. the CloudFront URL) supplied via context.
  const adminUrls = [
    DEFAULTS.adminDevUrl,
    ...(domainEnabled ? [`https://admin.${domainName}`] : []),
    ...csv(ctx("adminUrls")),
  ];

  return {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: ctx("region") ?? process.env.CDK_DEFAULT_REGION ?? DEFAULTS.region,
    appName: ctx("appName") ?? DEFAULTS.appName,
    domainName,
    domainEnabled,
    tableName: ctx("tableName") ?? DEFAULTS.tableName,
    mediaCorsOrigins: corsRaw ? csv(corsRaw) : ["*"],
    adminUrls: [...new Set(adminUrls)],
    googleAuthEnabled: ctx("googleAuthEnabled") === "true",
    alertEmail: ctx("alertEmail"),
    contactEmail: ctx("contactEmail"),
    monthlyBudgetUsd: Number(ctx("monthlyBudgetUsd") ?? DEFAULTS.monthlyBudgetUsd),
    githubRepo: ctx("githubRepo"),
    githubOidcProviderArn: ctx("githubOidcProviderArn"),
  };
}
