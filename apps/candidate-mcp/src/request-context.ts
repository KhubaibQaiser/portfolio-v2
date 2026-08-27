import { AsyncLocalStorage } from "node:async_hooks";
import type { ClientRateLimit } from "./config";

/** Per-request client rate limits for HTTP tool calls (see `http-handler.ts`). */
export const clientRateLimitStorage = new AsyncLocalStorage<ClientRateLimit>();

export function getClientRateLimit(fallback: ClientRateLimit): ClientRateLimit {
  return clientRateLimitStorage.getStore() ?? fallback;
}
