import { parseAdminEmails } from "@portfolio/shared/constants";

/**
 * Resolved admin allowlist.
 *
 * Sourced from the `ADMIN_ALLOWED_EMAILS` env var (CSV), set per-deploy from a
 * GitHub repository variable — so admins are added/removed by editing the
 * variable and redeploying, no code change. Locally, set it in `.env.local`.
 *
 * No fallback by design: an unset/empty value throws immediately rather than
 * silently allowing a baked-in default, so a misconfiguration fails loudly here
 * instead of surfacing as a confusing "unauthorized" much later.
 *
 * Reads `process.env` directly (not the `@t3-oss/env` object) so it stays
 * edge-safe for use in `middleware.ts`.
 */
export function getAllowedAdminEmails(): readonly string[] {
  const emails = parseAdminEmails(process.env.ADMIN_ALLOWED_EMAILS);
  if (emails.length === 0) {
    throw new Error(
      "ADMIN_ALLOWED_EMAILS is not set. Define it (CSV of admin emails) in the " +
        "admin Lambda environment (prod) or .env.local (dev).",
    );
  }
  return emails;
}
