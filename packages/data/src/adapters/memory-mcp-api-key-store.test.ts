import { describe, expect, it } from "vitest";
import { createMemoryMcpApiKeyStore } from "./memory-mcp-api-key-store";
import { parseApiKeyToken } from "./mcp-api-key-crypto";

describe("createMemoryMcpApiKeyStore", () => {
  it("creates, lists, verifies, and deletes a key", async () => {
    const store = createMemoryMcpApiKeyStore();
    const { key, record } = await store.createKey({
      name: "claude-ai",
      rateLimitMax: 30,
      rateLimitWindowSec: 60,
    });

    expect(parseApiKeyToken(key)).not.toBeNull();
    expect(record.name).toBe("claude-ai");
    expect(record.prefix).toContain("mcp_ck_");

    const listed = await store.listKeys();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(record.id);

    const verified = await store.verifyBearer(key);
    expect(verified?.name).toBe("claude-ai");

    await store.deleteKey(record.id);
    expect(await store.verifyBearer(key)).toBeNull();
    expect(await store.listKeys()).toHaveLength(0);
  });

  it("rejects duplicate names", async () => {
    const store = createMemoryMcpApiKeyStore();
    await store.createKey({ name: "n8n", rateLimitMax: 10, rateLimitWindowSec: 60 });
    await expect(
      store.createKey({ name: "n8n", rateLimitMax: 10, rateLimitWindowSec: 60 }),
    ).rejects.toThrow(/already exists/);
  });

  it("returns null for malformed tokens", async () => {
    const store = createMemoryMcpApiKeyStore();
    expect(await store.verifyBearer("not-a-key")).toBeNull();
  });
});
