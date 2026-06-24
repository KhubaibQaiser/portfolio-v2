/**
 * Edge-safe token cookie names and JWT decoding helpers. No `node:*` deps so
 * this can be imported from middleware. Decoding here is unverified and only
 * used for routing/expiry; authoritative signature verification lives in
 * `session.ts` (aws-jwt-verify) and gates every mutation via `requireAdmin`.
 */

export const ID_TOKEN_COOKIE = "id_token";
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const PKCE_VERIFIER_COOKIE = "pkce_verifier";
export const OAUTH_STATE_COOKIE = "oauth_state";

/** Refresh-token cookie lifetime; matches the pool client's 30-day window. */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export type IdTokenClaims = {
  sub?: string;
  email?: string;
  /** Expiry (seconds since epoch). */
  exp?: number;
};

/** Decodes a JWT payload without verifying its signature. */
export function decodeJwt(token: string): IdTokenClaims | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as IdTokenClaims;
  } catch {
    return null;
  }
}

/** True when the token is missing an expiry or is within `skewSeconds` of it. */
export function isExpired(claims: IdTokenClaims, skewSeconds = 30): boolean {
  if (typeof claims.exp !== "number") return true;
  return Date.now() / 1000 >= claims.exp - skewSeconds;
}
