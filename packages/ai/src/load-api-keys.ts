import "server-only";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secretCache = new Map<string, string>();
let groqLoaded = false;
let anthropicLoaded = false;

/**
 * `secretId` is the secret's complete ARN (incl. the random suffix) passed by
 * CDK from the SSM-published value, or the friendly name. Never a partial ARN.
 */
export async function getSecretString(secretId: string): Promise<string> {
  const cached = secretCache.get(secretId);
  if (cached !== undefined) return cached;

  const region = process.env.AWS_REGION ?? "eu-west-1";
  const client = new SecretsManagerClient({ region });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));

  const value = response.SecretString?.trim();
  if (!value) {
    throw new Error(`Secret ${secretId} has no SecretString value`);
  }

  secretCache.set(secretId, value);
  return value;
}

/**
 * Load the Groq API key from Secrets Manager (`GROQ_API_KEY_SECRET_ARN`).
 * Populates `process.env.GROQ_API_KEY` for the Vercel AI SDK after fetch.
 */
export async function ensureGroqApiKey(): Promise<void> {
  if (groqLoaded || process.env.GROQ_API_KEY) {
    groqLoaded = true;
    return;
  }

  const secretArn = process.env.GROQ_API_KEY_SECRET_ARN;
  if (!secretArn) {
    throw new Error("GROQ_API_KEY_SECRET_ARN is not configured");
  }

  process.env.GROQ_API_KEY = await getSecretString(secretArn);
  groqLoaded = true;
}

/**
 * Load the Anthropic API key from Secrets Manager (`ANTHROPIC_API_KEY_SECRET_ARN`).
 * Populates `process.env.ANTHROPIC_API_KEY` for the Vercel AI SDK after fetch.
 */
export async function ensureAnthropicApiKey(): Promise<void> {
  if (anthropicLoaded || process.env.ANTHROPIC_API_KEY) {
    anthropicLoaded = true;
    return;
  }

  const secretArn = process.env.ANTHROPIC_API_KEY_SECRET_ARN;
  if (!secretArn) {
    throw new Error("ANTHROPIC_API_KEY_SECRET_ARN is not configured");
  }

  process.env.ANTHROPIC_API_KEY = await getSecretString(secretArn);
  anthropicLoaded = true;
}

/** Load only the provider capabilities available for the selected model path. */
export async function ensureAiApiKeys(mode: "quality" | "fast" | "cheap"): Promise<void> {
  await ensureGroqApiKey();
  if (
    mode === "quality" &&
    (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_SECRET_ARN)
  ) {
    try {
      await ensureAnthropicApiKey();
    } catch {
      // Groq 20b remains a last-resort quality fallback when Anthropic cannot load.
      delete process.env.ANTHROPIC_API_KEY;
    }
  }
}
