import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { getContentRepository } from "@portfolio/data";
import { createProjectMcpServer } from "./server";

/**
 * Local dev entry: same tool over stdio, unauthenticated, against the fixture
 * backend by default. Never runs in production; the deployed server is
 * `lambda.ts` behind CloudFront origin-verify plus an OAuth Bearer token.
 */
const repo = getContentRepository();
const stdioRateLimit = {
  rateLimitMax: Number(process.env.MCP_RATE_LIMIT_MAX ?? 30),
  rateLimitWindowSec: Number(process.env.MCP_RATE_LIMIT_WINDOW_SEC ?? 60),
};

serveStdio(() => createProjectMcpServer(repo, undefined, stdioRateLimit));
