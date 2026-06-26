import "server-only";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secretCache = new Map<string, string>();
let groqLoaded = false;
let anthropicLoaded = false;

async function fetchSecretString(secretArn: string): Promise<string> {
  const cached = secretCache.get(secretArn);
  if (cached !== undefined) return cached;

  const region = process.env.AWS_REGION ?? "eu-west-1";
  const client = new SecretsManagerClient({ region });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  const value = response.SecretString?.trim();
  if (!value) {
    throw new Error(`Secret ${secretArn} has no SecretString value`);
  }

  secretCache.set(secretArn, value);
  return value;
}

/**
 * Load the Groq API key from Secrets Manager (`GROQ_API_KEY_SECRET_ARN`).
 * Populates `process.env.GROQ_API_KEY` for the Vercel AI SDK after fetch.
 */
export async function ensureGroqApiKey(): Promise<void> {
  if (groqLoaded) return;

  const secretArn = process.env.GROQ_API_KEY_SECRET_ARN;
  if (!secretArn) {
    throw new Error("GROQ_API_KEY_SECRET_ARN is not configured");
  }

  process.env.GROQ_API_KEY = await fetchSecretString(secretArn);
  groqLoaded = true;
}

/**
 * Load the Anthropic API key from Secrets Manager (`ANTHROPIC_API_KEY_SECRET_ARN`).
 * Populates `process.env.ANTHROPIC_API_KEY` for the Vercel AI SDK after fetch.
 */
export async function ensureAnthropicApiKey(): Promise<void> {
  if (anthropicLoaded) return;

  const secretArn = process.env.ANTHROPIC_API_KEY_SECRET_ARN;
  if (!secretArn) {
    throw new Error("ANTHROPIC_API_KEY_SECRET_ARN is not configured");
  }

  process.env.ANTHROPIC_API_KEY = await fetchSecretString(secretArn);
  anthropicLoaded = true;
}

/** Resolve Groq + Anthropic keys before resume/ATS model calls. */
export async function ensureAiApiKeys(): Promise<void> {
  await Promise.all([ensureGroqApiKey(), ensureAnthropicApiKey()]);
}
