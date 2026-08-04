import type {
  ChatResponseCache,
  ChatResponseCacheEntry,
} from "@portfolio/shared/ports";

type MemoryRow = {
  text: string;
  expiresAtSec: number;
};

/**
 * Process-local chat response cache for fixture/local backends.
 * Survives for the lifetime of the Node process (dev server / single Lambda).
 */
export function createMemoryChatResponseCache(): ChatResponseCache {
  const store = new Map<string, MemoryRow>();

  return {
    async get(key: string): Promise<ChatResponseCacheEntry | null> {
      const row = store.get(key);
      if (!row) return null;

      if (row.expiresAtSec <= Math.floor(Date.now() / 1000)) {
        store.delete(key);
        return null;
      }

      return { text: row.text, expiresAtSec: row.expiresAtSec };
    },

    async set(key: string, text: string, ttlSec: number): Promise<void> {
      const expiresAtSec =
        Math.floor(Date.now() / 1000) + Math.max(1, Math.floor(ttlSec));
      store.set(key, { text, expiresAtSec });
    },
  };
}
