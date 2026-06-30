import "server-only";
import { APIError, betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { getAllowedAdminEmails } from "@/lib/admin-emails";
import { getAuthSecrets } from "@/lib/auth/secrets";

function resolveBaseUrl(): string {
  const origin = process.env.APP_ORIGIN ?? process.env.BETTER_AUTH_URL;
  if (!origin) {
    throw new Error(
      "Auth base URL is not configured: set APP_ORIGIN (prod) or BETTER_AUTH_URL (local dev).",
    );
  }
  return origin.replace(/\/+$/, "");
}

function buildTrustedOrigins(baseUrl: string): string[] {
  const origins = new Set<string>([baseUrl, "http://localhost:3001"]);
  const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (extra) {
    for (const part of extra.split(",")) {
      const trimmed = part.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  return [...origins];
}

function buildAuth(secrets: Awaited<ReturnType<typeof getAuthSecrets>>) {
  const baseURL = resolveBaseUrl();
  const trustedOrigins = buildTrustedOrigins(baseURL);

  return betterAuth({
    secret: secrets.betterAuthSecret,
    baseURL,
    trustedOrigins,
    socialProviders: {
      google: {
        clientId: secrets.googleClientId,
        clientSecret: secrets.googleClientSecret,
        mapProfileToUser: (profile) => ({
          googleSub: profile.sub,
          email: profile.email ?? undefined,
        }),
      },
    },
    user: {
      additionalFields: {
        googleSub: {
          type: "string",
          required: true,
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7,
        strategy: "jwe",
      },
    },
    account: {
      storeStateStrategy: "cookie",
      storeAccountCookie: true,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            let allowed: readonly string[];
            try {
              allowed = getAllowedAdminEmails();
            } catch {
              throw new APIError("FORBIDDEN", {
                message: "Admin allowlist is not configured",
              });
            }
            if (!isAllowedAdmin(user.email, allowed)) {
              throw new APIError("FORBIDDEN", {
                message: "This account is not authorized to access the admin dashboard",
              });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [
      customSession(async ({ user, session }) => ({
        user,
        session,
      })),
      nextCookies(),
    ],
  });
}

type AuthApp = ReturnType<typeof buildAuth>;

let authInstance: AuthApp | null = null;

/** Memoized Better Auth instance (stateless — no database). */
export async function getAuth(): Promise<AuthApp> {
  if (authInstance) return authInstance;
  const secrets = await getAuthSecrets();
  const instance = buildAuth(secrets);
  authInstance = instance;
  return instance;
}
