const PREFIX = "google-site-verification=";

/**
 * Normalizes a Search Console DNS TXT value for Route 53.
 * Accepts either the full `google-site-verification=…` string or the token alone.
 */
export function googleSiteVerificationTxtValue(raw: string): string {
  const trimmed = raw.trim().replace(/^"+|"+$/g, "");
  if (!trimmed) {
    throw new Error("Google DNS site verification value is empty");
  }
  if (trimmed.toLowerCase().startsWith(PREFIX)) {
    return `${PREFIX}${trimmed.slice(PREFIX.length)}`;
  }
  return `${PREFIX}${trimmed}`;
}
