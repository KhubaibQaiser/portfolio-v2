import { createLogger, type Logger } from "@portfolio/observability";

let logger: Logger | undefined;

/** Process-wide structured logger, matching the web/admin apps' convention. */
export function getLogger(): Logger {
  logger ??= createLogger({ serviceName: "portfolio-candidate-mcp" });
  return logger;
}

export type ToolCallAudit = {
  tool: string;
  clientId: string;
  scopes: string[];
  ok: boolean;
  /** Set when `ok` is false; never includes tool output, only the failure reason. */
  reason?: string;
};

/**
 * Structured audit line for every tool invocation. Deliberately logs only
 * the caller's identity (`clientId`, `scopes`) and the outcome — never the
 * tool arguments or response body, which may contain candidate profile text.
 * CloudWatch Logs Insights can slice this by `clientId` for per-consumer
 * usage/abuse investigation.
 */
export function auditToolCall(audit: ToolCallAudit): void {
  getLogger().info("mcp_tool_call", { ...audit });
}
