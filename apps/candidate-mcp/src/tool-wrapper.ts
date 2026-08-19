import type { AuthInfo, CallToolResult } from "@modelcontextprotocol/server";
import { auditToolCall } from "./audit-log";
import { checkRateLimit } from "./rate-limit";
import type { Config } from "./config";

/**
 * Wraps a tool handler with the two per-call guardrails every tool in this
 * server needs: a per-`client_id` rate limit and a structured audit log
 * entry — so adding a new tool can't forget either one.
 *
 * `authInfo` is `undefined` only for the local stdio transport (no HTTP,
 * no verified caller — see `index.ts`); that path rate-limits under a fixed
 * `"stdio"` identifier and is never reachable from the network.
 */
export function withGuardrails(
  toolName: string,
  authInfo: AuthInfo | undefined,
  config: Pick<Config, "rateLimitMax" | "rateLimitWindowSec">,
  handler: () => Promise<CallToolResult>,
): () => Promise<CallToolResult> {
  return async () => {
    const clientId = authInfo?.clientId ?? "stdio";
    const scopes = authInfo?.scopes ?? [];

    const rateLimit = await checkRateLimit(clientId, config);
    if (!rateLimit.ok) {
      auditToolCall({
        tool: toolName,
        clientId,
        scopes,
        ok: false,
        reason: "rate_limited",
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `rate_limited: retry after ${rateLimit.retryAfterSeconds}s`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await handler();
      auditToolCall({ tool: toolName, clientId, scopes, ok: !result.isError });
      return result;
    } catch (error) {
      auditToolCall({
        tool: toolName,
        clientId,
        scopes,
        ok: false,
        reason: error instanceof Error ? error.message : "unknown_error",
      });
      throw error;
    }
  };
}
