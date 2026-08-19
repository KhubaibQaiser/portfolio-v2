import { McpServer, type AuthInfo } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import { registerGetCandidateProfileTool } from "./tools/get-candidate-profile";
import { registerGetCandidateFactsTool } from "./tools/get-candidate-facts";
import type { Config } from "./config";

/**
 * Builds one `McpServer` instance registering both read-only tools. Called
 * once per HTTP request under `createMcpHandler` (see `http-handler.ts`) and
 * once per connection under `serveStdio` (see `index.ts`) — the same
 * definitions serve both transports, per the SDK's per-request-factory model.
 */
export function createCandidateMcpServer(
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  config: Pick<Config, "rateLimitMax" | "rateLimitWindowSec">,
): McpServer {
  const server = new McpServer({ name: "candidate-profile-mcp", version: "1.0.0" });
  registerGetCandidateProfileTool(server, repo, authInfo, config);
  registerGetCandidateFactsTool(server, repo, authInfo, config);
  return server;
}
