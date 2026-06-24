import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl } from "@/lib/auth/oauth";
import { OAUTH_STATE_COOKIE, PKCE_VERIFIER_COOKIE } from "@/lib/auth/tokens";

const base64url = (bytes: Buffer): string => bytes.toString("base64url");

/** Public origin behind CloudFront, or the request origin for local dev. */
function resolveOrigin(request: NextRequest): string {
  return process.env.APP_ORIGIN ?? request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const verifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(verifier).digest());
  const state = base64url(randomBytes(16));

  const redirectUri = `${resolveOrigin(request)}/auth/callback`;
  const authorizeUrl = buildAuthorizeUrl({ redirectUri, state, codeChallenge });

  const store = await cookies();
  const shortLived = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  store.set(PKCE_VERIFIER_COOKIE, verifier, shortLived);
  store.set(OAUTH_STATE_COOKIE, state, shortLived);

  return NextResponse.redirect(authorizeUrl);
}
