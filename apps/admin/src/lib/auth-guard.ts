import { isAllowedAdmin } from "@portfolio/shared/constants";
import { getAllowedAdminEmails } from "@/lib/admin-emails";
import { getCurrentIdentity } from "@/lib/auth/session";

export type AdminAuth =
  | { ok: true; id: string; email: string }
  | { ok: false; error: string };

/**
 * Authorizes the current request as an allow-listed admin.
 *
 * The data layer (DynamoDB) has no row-level security, so authorization must be
 * enforced explicitly at every mutation boundary rather than relying on the
 * middleware route guard alone. This is the single place that resolves the
 * verified Cognito identity and checks the email allowlist.
 */
export async function requireAdmin(): Promise<AdminAuth> {
  const identity = await getCurrentIdentity();

  if (!identity?.email || !isAllowedAdmin(identity.email, getAllowedAdminEmails())) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, id: identity.sub, email: identity.email };
}
