import "server-only";
import { cookies } from "next/headers";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { AdminIdentity } from "@portfolio/shared/ports";
import type { TokenSet } from "./oauth";
import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
} from "./tokens";

type Verifier = ReturnType<
  typeof CognitoJwtVerifier.create<{
    userPoolId: string;
    tokenUse: "id";
    clientId: string;
  }>
>;

let verifier: Verifier | null = null;

function getVerifier(): Verifier {
  if (verifier) return verifier;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    throw new Error(
      "Cognito is not configured: set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.",
    );
  }
  verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
  return verifier;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Cryptographically verifies a Cognito ID token and extracts the identity. */
export async function verifyIdToken(idToken: string): Promise<AdminIdentity> {
  const payload = await getVerifier().verify(idToken);
  const email = typeof payload.email === "string" ? payload.email : "";
  return { sub: payload.sub, email };
}

/**
 * Resolves the admin identity from the verified ID token cookie. Returns null
 * for an absent/expired/invalid token — an expected unauthenticated state that
 * the middleware refreshes, not a swallowed error.
 */
export async function getCurrentIdentity(): Promise<AdminIdentity | null> {
  const store = await cookies();
  const idToken = store.get(ID_TOKEN_COOKIE)?.value;
  if (!idToken) return null;
  try {
    return await verifyIdToken(idToken);
  } catch {
    return null;
  }
}

export async function setSessionCookies(tokens: TokenSet): Promise<void> {
  const store = await cookies();
  store.set(ID_TOKEN_COOKIE, tokens.idToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn,
  });
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn,
  });
  if (tokens.refreshToken) {
    store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE,
    });
  }
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ID_TOKEN_COOKIE);
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}
