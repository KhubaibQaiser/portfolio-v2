/**
 * True when `url` is an https URL on the media origin. Media URLs are only
 * stored and rendered, never fetched server-side (ADR 0003 SSRF rule), and
 * `next/image` only allows this host.
 */
export function isMediaUrl(
  url: string,
  mediaBaseUrl: string | null | undefined,
): boolean {
  if (!mediaBaseUrl) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && parsed.hostname === new URL(mediaBaseUrl).hostname
    );
  } catch {
    return false;
  }
}
