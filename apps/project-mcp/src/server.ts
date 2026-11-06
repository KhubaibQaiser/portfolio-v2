import { McpServer, type AuthInfo } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import { registerProposeProjectTool, readToolEnv, type ToolEnv } from "./tools/propose-project";
import type { ClientRateLimit } from "./config";

/**
 * Builds one `McpServer` per HTTP request (see `http-handler.ts`) or stdio
 * connection (`index.ts`). The only tool is `propose_project`, which can only
 * create drafts (ADR 0008).
 */
export function createProjectMcpServer(
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  clientRateLimit: ClientRateLimit,
  env: ToolEnv = readToolEnv(),
): McpServer {
  const server = new McpServer({ name: "project-write-mcp", version: "1.0.0" });
  registerProposeProjectTool(server, repo, authInfo, clientRateLimit, env);
  return server;
}
