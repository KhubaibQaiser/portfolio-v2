import { NextResponse, type NextRequest } from "next/server";
import { buildLogoutUrl } from "@/lib/auth/oauth";
import { clearSessionCookies } from "@/lib/auth/session";

function resolveOrigin(request: NextRequest): string {
  return process.env.APP_ORIGIN ?? request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  await clearSessionCookies();
  // Cognito requires logout_uri to exactly match a registered sign-out URL
  // (the app origin). It lands on `/`, which the middleware sends to `/login`.
  return NextResponse.redirect(buildLogoutUrl(resolveOrigin(request)));
}
