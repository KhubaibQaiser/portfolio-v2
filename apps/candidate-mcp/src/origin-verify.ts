import { timingSafeEqual } from "node:crypto";

/**
 * CloudFront origin custom header that proves the request came through our
 * distribution. CloudFront overwrites any viewer-supplied copy. Direct
 * Function URL callers do not have this value. Must stay distinct from
 * `Authorization` (MCP Bearer) — see ADR 0003.
 */
export const ORIGIN_VERIFY_HEADER = "x-origin-verify";

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Network-layer gate: missing/wrong origin-verify is a uniform 403 so probes
 * cannot distinguish "no header" from "wrong secret". Callers that skip
 * CloudFront never reach Host/OAuth/metadata.
 *
 * `expectedSecret` is required in production. A missing secret fails closed
 * rather than opening the Function URL.
 */
export function originVerifyResponse(
  request: Request,
  expectedSecret: string | null,
): Response | undefined {
  if (
    !expectedSecret ||
    !secretsEqual(request.headers.get(ORIGIN_VERIFY_HEADER) ?? "", expectedSecret)
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return undefined;
}
