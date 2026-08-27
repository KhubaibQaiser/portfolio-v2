import { McpServer, type AuthInfo } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import { registerGetCandidateProfileTool } from "./tools/get-candidate-profile";
import { registerGetCandidateFactsTool } from "./tools/get-candidate-facts";
import type { ClientRateLimit, Config } from "./config";
import { getClientRateLimit } from "./request-context";

/**
 * Builds one `McpServer` instance registering both read-only tools. Called
 * once per HTTP request under `createMcpHandler` (see `http-handler.ts`) and
 * once per connection under `serveStdio` (see `index.ts`) — the same
 * definitions serve both transports, per the SDK's per-request-factory model.
 */
export function createCandidateMcpServer(
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  fallbackRateLimit: ClientRateLimit,
): McpServer {
  const server = new McpServer({ name: "candidate-profile-mcp", version: "1.0.0" });
  const clientRateLimit = getClientRateLimit(fallbackRateLimit);
  registerGetCandidateProfileTool(server, repo, authInfo, clientRateLimit);
  registerGetCandidateFactsTool(server, repo, authInfo, clientRateLimit);
  return server;
}

export type StdioRateLimitDefaults = Pick<Config, "rateLimitMax" | "rateLimitWindowSec">;
