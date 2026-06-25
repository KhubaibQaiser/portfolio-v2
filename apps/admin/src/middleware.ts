import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { getAllowedAdminEmails } from "@/lib/admin-emails";
import { refreshTokens } from "@/lib/auth/oauth";
import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  decodeJwt,
  isExpired,
  type IdTokenClaims,
} from "@/lib/auth/tokens";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OAuth route handlers manage their own cookies/redirects.
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  const isLoginPage = pathname === "/login";
  const response = NextResponse.next();

  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value;
  let claims: IdTokenClaims | null = idToken ? decodeJwt(idToken) : null;

  // Silently refresh an expired/absent ID token when a refresh token exists, so
  // the downstream handlers (and `requireAdmin`) see a fresh, verifiable token.
  if (!claims || isExpired(claims)) {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (refreshToken) {
      try {
        const tokens = await refreshTokens(refreshToken);
        claims = decodeJwt(tokens.idToken);
        const secure = process.env.NODE_ENV === "production";
        const base = {
          httpOnly: true,
          secure,
          sameSite: "lax" as const,
          path: "/",
        };
        response.cookies.set(ID_TOKEN_COOKIE, tokens.idToken, {
          ...base,
          maxAge: tokens.expiresIn,
        });
        response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
          ...base,
          maxAge: tokens.expiresIn,
        });
        request.cookies.set(ID_TOKEN_COOKIE, tokens.idToken);
        if (tokens.refreshToken) {
          response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
            ...base,
            maxAge: REFRESH_MAX_AGE,
          });
        }
      } catch (error) {
        // Refresh failed (token revoked/expired) — fall through unauthenticated.
        console.error("Token refresh failed in middleware:", error);
        claims = null;
      }
    }
  }

  const isAuthed =
    !!claims && !isExpired(claims) && isAllowedAdmin(claims.email, getAllowedAdminEmails());

  if (!isAuthed && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthed && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
