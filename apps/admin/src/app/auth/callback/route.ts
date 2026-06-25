import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { getAllowedAdminEmails } from "@/lib/admin-emails";
import { exchangeCodeForTokens } from "@/lib/auth/oauth";
import {
  clearSessionCookies,
  setSessionCookies,
  verifyIdToken,
} from "@/lib/auth/session";
import { OAUTH_STATE_COOKIE, PKCE_VERIFIER_COOKIE } from "@/lib/auth/tokens";
import { logger } from "@/lib/logger";

function resolveOrigin(request: NextRequest): string {
  return process.env.APP_ORIGIN ?? request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const origin = resolveOrigin(request);
  const loginWithError = (code: string) =>
    NextResponse.redirect(`${origin}/login?error=${code}`);

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = store.get(PKCE_VERIFIER_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(PKCE_VERIFIER_COOKIE);

  if (!code) return loginWithError("missing_code");
  if (!state || !expectedState || state !== expectedState) {
    return loginWithError("invalid_state");
  }
  if (!codeVerifier) return loginWithError("invalid_state");

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: `${origin}/auth/callback`,
      codeVerifier,
    });

    const identity = await verifyIdToken(tokens.idToken);
    if (!isAllowedAdmin(identity.email, getAllowedAdminEmails())) {
      logger.warn("admin sign-in rejected: email not allow-listed", {
        sub: identity.sub,
      });
      await clearSessionCookies();
      return loginWithError("unauthorized");
    }

    await setSessionCookies(tokens);
    logger.info("admin signed in", { sub: identity.sub });
    return NextResponse.redirect(`${origin}/`);
  } catch (error) {
    logger.error("auth callback failed", {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return loginWithError("auth_failed");
  }
}
