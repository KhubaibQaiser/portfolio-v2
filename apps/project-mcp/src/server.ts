import { McpServer, type AuthInfo } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import {
  registerProposeProjectTool,
  readToolEnv,
  type ToolEnv,
} from "./tools/propose-project";
import { registerProjectEditTools } from "./tools/project-edit";
import type { ClientRateLimit } from "./config";

/**
 * Builds one `McpServer` per HTTP request (see `http-handler.ts`) or stdio
 * connection (`index.ts`). Tools: `propose_project` (new drafts, ADR 0009) plus
 * list/get/update for existing projects (ADR 0010). No delete or publish.
 */
export function createProjectMcpServer(
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  clientRateLimit: ClientRateLimit,
  env: ToolEnv = readToolEnv(),
): McpServer {
  const server = new McpServer({ name: "project-write-mcp", version: "1.0.0" });
  registerProposeProjectTool(server, repo, authInfo, clientRateLimit, env);
  registerProjectEditTools(server, repo, authInfo, clientRateLimit, env);
  return server;
}
