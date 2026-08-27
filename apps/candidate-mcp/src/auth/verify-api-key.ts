import type { VerifiedMcpApiKey } from "@portfolio/shared/ports/mcp-api-key-store";
import type { McpApiKeyStore } from "@portfolio/shared/ports/mcp-api-key-store";
import { timingSafeEqual } from "node:crypto";
import { runDummyHashCompare } from "@portfolio/data";

export type ApiKeyAuthContext = {
  verified: VerifiedMcpApiKey;
  bearerToken: string;
};

export type SmokeKeyConfig = {
  plaintext: string;
  rateLimitMax: number;
  rateLimitWindowSec: number;
};

function smokeSecretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Verifies a Bearer token against the CI smoke-test secret (Secrets Manager)
 * or hashed keys in Dynamo. Returns null when the token is invalid or expired.
 */
export async function verifyApiKeyBearer(
  token: string,
  keyStore: McpApiKeyStore,
  smokeKey?: SmokeKeyConfig,
): Promise<ApiKeyAuthContext | null> {
  if (smokeKey && smokeSecretsEqual(token, smokeKey.plaintext)) {
    return {
      bearerToken: token,
      verified: {
        id: "smoke-test",
        name: "smoke-test",
        rateLimitMax: smokeKey.rateLimitMax,
        rateLimitWindowSec: smokeKey.rateLimitWindowSec,
        expiresAt: null,
      },
    };
  }

  const verified = await keyStore.verifyBearer(token);
  if (!verified) {
    runDummyHashCompare(token);
    return null;
  }

  return { bearerToken: token, verified };
}

/** Parses `Authorization: Bearer …` and returns the token or null. */
export function parseBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

/** First public IP from proxy headers (CloudFront forwards X-Forwarded-For). */
export function getViewerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
