import { createSign, generateKeyPairSync, type KeyObject } from "node:crypto";
import type { Jwks } from "aws-jwt-verify/jwk";

/**
 * Minimal RS256 JWT signing for tests only, so `verify-agent-token.test.ts`
 * can exercise real signature verification against a locally generated key
 * pair — no network JWKS fetch, no live Cognito user pool required. Not
 * exported from the app's public surface; imported only by test files.
 */

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

export function generateTestKeyPair(): { publicKey: KeyObject; privateKey: KeyObject } {
  return generateKeyPairSync("rsa", { modulusLength: 2048 });
}

export function signTestJwt(
  payload: Record<string, unknown>,
  privateKey: KeyObject,
  kid: string,
): string {
  const header = { alg: "RS256", typ: "JWT", kid };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

export function testJwks(publicKey: KeyObject, kid: string): Jwks {
  const jwk = publicKey.export({ format: "jwk" }) as { n: string; e: string };
  return {
    keys: [{ kty: "RSA", n: jwk.n, e: jwk.e, kid, alg: "RS256", use: "sig" }],
  };
}
