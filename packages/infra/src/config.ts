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
  /** Prefix for the per-entity DynamoDB table names (matches DYNAMO_TABLE_PREFIX). */
  tablePrefix: string;
  /** Browser origins allowed to upload directly to the media bucket. */
  mediaCorsOrigins: string[];
  /**
   * Admin app origins used for APP_ORIGIN and Better Auth trusted origins.
   * Always includes localhost for dev; pass the deployed admin origin via
   * `-c adminUrls=https://...` (csv) until the custom domain is delegated.
   */
  adminUrls: string[];
  /**
   * Emails granted admin dashboard access, injected into the admin Lambda as
   * `ADMIN_ALLOWED_EMAILS`. Pass via `-c adminAllowedEmails=a@x.com,b@y.com`
   * (csv, typically from a GitHub variable). When empty the app falls back to
   * the in-repo default allowlist.
   */
  adminAllowedEmails: string[];
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
  /**
   * Resend "from" address for the contact form (must use a verified domain).
   * Pass via `-c contactFromEmail=Name <you@mail.example.com>`.
   */
  contactFromEmail?: string;
  /**
   * PostHog project API key for server-side capture on the web Lambda.
   * Pass via `-c posthogProjectToken=phc_…` (same value as NEXT_PUBLIC_* at build).
   */
  posthogProjectToken?: string;
  /**
   * PostHog ingestion host for posthog-node (e.g. https://us.i.posthog.com).
   * Pass via `-c posthogHost=…`.
   */
  posthogHost?: string;
  /**
   * Environment super-property for server events (e.g. production).
   * Pass via `-c posthogEnvironment=production`.
   */
  posthogEnvironment?: string;
  /**
   * Google Search Console Domain verification TXT value
   * (`google-site-verification=…`, or the token alone).
   * Pass via `-c googleDnsSiteVerification=…`. Creates an apex TXT record.
   */
  googleDnsSiteVerification?: string;
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
  /**
   * Globally-unique Cognito hosted-domain prefix for the candidate-mcp
   * server's OAuth2 token endpoint. Pass via `-c mcpCognitoDomainPrefix=…`
   * only if the default collides with another AWS account's domain.
   */
  mcpCognitoDomainPrefix: string;
};

const DEFAULTS = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "khubaibqaiser.com",
  tablePrefix: "portfolio",
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
    tablePrefix: ctx("tablePrefix") ?? DEFAULTS.tablePrefix,
    mediaCorsOrigins: corsRaw
      ? csv(corsRaw)
      : domainEnabled
        ? [
            `https://${domainName}`,
            `https://www.${domainName}`,
            `https://admin.${domainName}`,
            DEFAULTS.adminDevUrl,
          ]
        : ["*"],
    adminUrls: [...new Set(adminUrls)],
    adminAllowedEmails: csv(ctx("adminAllowedEmails")),
    alertEmail: ctx("alertEmail"),
    contactEmail: ctx("contactEmail"),
    contactFromEmail: ctx("contactFromEmail"),
    posthogProjectToken: ctx("posthogProjectToken"),
    posthogHost: ctx("posthogHost"),
    posthogEnvironment: ctx("posthogEnvironment"),
    googleDnsSiteVerification: ctx("googleDnsSiteVerification"),
    monthlyBudgetUsd: Number(ctx("monthlyBudgetUsd") ?? DEFAULTS.monthlyBudgetUsd),
    githubRepo: ctx("githubRepo"),
    githubOidcProviderArn: ctx("githubOidcProviderArn"),
    mcpCognitoDomainPrefix:
      ctx("mcpCognitoDomainPrefix") ?? `${domainName.replace(/\./g, "-")}-candidate-mcp`,
  };
}
