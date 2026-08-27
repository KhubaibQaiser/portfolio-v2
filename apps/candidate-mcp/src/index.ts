import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { getContentRepository } from "@portfolio/data";
import { createCandidateMcpServer } from "./server";

/**
 * Local dev / manual-testing entry point: serves the same tools over stdio,
 * unauthenticated, against the fixture content backend by default (set
 * `DATA_BACKEND=dynamo` + AWS credentials to point at real data).
 *
 * This process never runs in production — the deployed server is
 * `lambda.ts`, reached only through CloudFront with origin-verify plus an
 * OAuth Bearer access token (ADR 0006). stdio has no network exposure, so skipping
 * auth here mirrors `packages/agent-mcp`'s existing local-only trust model.
 */
const repo = getContentRepository();
const stdioRateLimit = {
  rateLimitMax: Number(process.env.MCP_RATE_LIMIT_MAX ?? 30),
  rateLimitWindowSec: Number(process.env.MCP_RATE_LIMIT_WINDOW_SEC ?? 60),
};

serveStdio(() => createCandidateMcpServer(repo, undefined, stdioRateLimit));
