"use server";

import { getMcpApiKeyStore } from "@portfolio/data";
import { mcpApiKeyCreateSchema } from "@portfolio/shared/schemas/mcp-api-key";
import type { McpApiKeyRecord } from "@portfolio/shared/ports/mcp-api-key-store";
import { requireAdmin } from "@/lib/auth-guard";

export type ActionResult = { success: true } | { success: false; error: string };

export type CreateMcpApiKeyResult =
  | { success: true; key: string; record: McpApiKeyRecord }
  | { success: false; error: string };

export async function createMcpApiKey(values: unknown): Promise<CreateMcpApiKeyResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = mcpApiKeyCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const result = await getMcpApiKeyStore().createKey({
      name: parsed.data.name,
      rateLimitMax: parsed.data.rateLimitMax,
      rateLimitWindowSec: parsed.data.rateLimitWindowSec,
      expiresAt: parsed.data.expiresAt ?? null,
    });
    return { success: true, key: result.key, record: result.record };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create API key";
    return { success: false, error: message };
  }
}

export async function deleteMcpApiKey(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!id.trim()) {
    return { success: false, error: "Key id is required" };
  }

  try {
    await getMcpApiKeyStore().deleteKey(id);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete API key";
    return { success: false, error: message };
  }
}
