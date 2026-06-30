import { isAllowedAdmin, parseAdminEmails } from "@portfolio/shared/constants";

/**
 * Whether `email` is permitted by the CSV allowlist env value. Returns false when
 * the allowlist is empty/unset — callers that need a hard failure should use
 * {@link getAllowedAdminEmails} instead.
 */
export function isAdminEmailAllowed(
  email: string | null | undefined,
  rawAllowlist: string | undefined | null,
): boolean {
  const allowed = parseAdminEmails(rawAllowlist);
  if (allowed.length === 0) return false;
  return isAllowedAdmin(email, allowed);
}
