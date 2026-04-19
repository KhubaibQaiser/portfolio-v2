/**
 * Extract PostHog distinct_id from the `ph_phc_*_posthog` cookie value (JSON).
 */
export function parseDistinctIdFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/ph_phc_[^=]+=([^;]+)/);
  if (!match?.[1]) return undefined;
  try {
    const decoded = decodeURIComponent(match[1].trim());
    const data = JSON.parse(decoded) as { distinct_id?: string };
    const id = data.distinct_id;
    return typeof id === "string" && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}
