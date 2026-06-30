import "server-only";
import { z } from "zod";
import { getSecretString } from "@portfolio/ai";

const googleOAuthSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export type AuthSecrets = {
  googleClientId: string;
  googleClientSecret: string;
  betterAuthSecret: string;
};

let cached: AuthSecrets | null = null;

async function loadGoogleOAuth(): Promise<{ clientId: string; clientSecret: string }> {
  const secretArn = process.env.GOOGLE_OAUTH_SECRET_ARN;
  if (secretArn) {
    const raw = await getSecretString(secretArn);
    return googleOAuthSchema.parse(JSON.parse(raw));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }

  throw new Error(
    "Google OAuth is not configured: set GOOGLE_OAUTH_SECRET_ARN (prod) or " +
      "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (local dev).",
  );
}

async function loadBetterAuthSecret(): Promise<string> {
  const secretArn = process.env.BETTER_AUTH_SECRET_ARN;
  if (secretArn) {
    return getSecretString(secretArn);
  }

  const direct = process.env.BETTER_AUTH_SECRET;
  if (direct) return direct;

  throw new Error(
    "Better Auth secret is not configured: set BETTER_AUTH_SECRET_ARN (prod) or " +
      "BETTER_AUTH_SECRET (local dev).",
  );
}

/** Cached auth secrets from Secrets Manager or local env (dev). */
export async function getAuthSecrets(): Promise<AuthSecrets> {
  if (cached) return cached;

  const [google, betterAuthSecret] = await Promise.all([
    loadGoogleOAuth(),
    loadBetterAuthSecret(),
  ]);

  cached = {
    googleClientId: google.clientId,
    googleClientSecret: google.clientSecret,
    betterAuthSecret,
  };
  return cached;
}
