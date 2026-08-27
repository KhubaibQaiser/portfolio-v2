import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { SmokeKeyConfig } from "./verify-api-key";

const SMOKE_CLIENT_ID = "smoke-test";

let cachedSmokeKey: SmokeKeyConfig | undefined;
let loadPromise: Promise<SmokeKeyConfig | undefined> | undefined;

/**
 * Loads the deploy-time smoke-test bearer from Secrets Manager once per
 * execution environment. The secret is a plain generated string — not a
 * Dynamo row — so CI can validate the live endpoint without admin minting.
 */
export function loadSmokeKeyConfig(
  secretArn: string | undefined,
  limits: Pick<SmokeKeyConfig, "rateLimitMax" | "rateLimitWindowSec">,
): () => Promise<SmokeKeyConfig | undefined> {
  if (!secretArn) {
    return async () => undefined;
  }

  return async () => {
    if (cachedSmokeKey) return cachedSmokeKey;
    loadPromise ??= (async () => {
      const client = new SecretsManagerClient({});
      const result = await client.send(
        new GetSecretValueCommand({ SecretId: secretArn }),
      );
      const plaintext = result.SecretString?.trim();
      if (!plaintext) {
        throw new Error("Smoke test key secret is empty");
      }
      cachedSmokeKey = {
        plaintext,
        rateLimitMax: limits.rateLimitMax,
        rateLimitWindowSec: limits.rateLimitWindowSec,
      };
      return cachedSmokeKey;
    })();
    return loadPromise;
  };
}

export { SMOKE_CLIENT_ID };
