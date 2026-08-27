import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import type { McpApiKeyStore } from "@portfolio/shared/ports/mcp-api-key-store";
import {
  getViewerIp,
  parseBearerToken,
  verifyApiKeyBearer,
  type SmokeKeyConfig,
} from "./auth/verify-api-key";
import { originVerifyResponse } from "./origin-verify";
import type { ClientRateLimit, Config } from "./config";
import { createCandidateMcpServer } from "./server";
import { checkIpRateLimit } from "./ip-rate-limit";
import { clientRateLimitStorage } from "./request-context";

export type HttpHandlerDeps = {
  config: Config;
  repo: ContentRepository;
  keyStore: McpApiKeyStore;
  getSmokeKey?: () => Promise<SmokeKeyConfig | undefined>;
};

export type RequestAuth = {
  authInfo: AuthInfo;
  clientRateLimit: ClientRateLimit;
};

function toAuthInfo(
  bearerToken: string,
  verified: { id: string; name: string; expiresAt: number | null },
  serverUrl: string,
): AuthInfo {
  return {
    token: bearerToken,
    clientId: verified.name,
    scopes: ["profile.read"],
    expiresAt: verified.expiresAt ?? undefined,
    resource: new URL(serverUrl),
  };
}

/**
 * Assembles this server's web-standard `fetch(request) => Response` handler:
 * origin-verify → kill switch → Host/Origin validation → per-IP limit →
 * API-key gate → MCP dispatch. No OAuth discovery (ADR 0005).
 */
export function createHttpHandler(
  deps: HttpHandlerDeps,
): (request: Request) => Promise<Response> {
  const { config, repo, keyStore, getSmokeKey } = deps;
  const serverUrl = new URL(config.serverUrl);
  const allowedHostnames = [serverUrl.hostname];

  const mcpHandler = createMcpHandler((ctx) =>
    createCandidateMcpServer(repo, ctx.authInfo, {
      rateLimitMax: config.rateLimitMax,
      rateLimitWindowSec: config.rateLimitWindowSec,
    }),
  );

  return async function fetch(request: Request): Promise<Response> {
    const originRejected = originVerifyResponse(request, config.originVerifySecret);
    if (originRejected) return originRejected;

    if (!config.enabled) {
      return Response.json({ error: "service_unavailable" }, { status: 503 });
    }

    const rejected =
      hostHeaderValidationResponse(request, allowedHostnames) ??
      originValidationResponse(request, allowedHostnames);
    if (rejected) return rejected;

    let ipLimit;
    try {
      ipLimit = await checkIpRateLimit(getViewerIp(request), config);
    } catch {
      return Response.json({ error: "service_unavailable" }, { status: 503 });
    }
    if (!ipLimit.ok) {
      return Response.json(
        { error: "rate_limited", retryAfterSeconds: ipLimit.retryAfterSeconds },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
        },
      );
    }

    const bearer = parseBearerToken(request);
    if (!bearer) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    let smokeKey: SmokeKeyConfig | undefined;
    try {
      smokeKey = getSmokeKey ? await getSmokeKey() : undefined;
    } catch {
      return Response.json({ error: "service_unavailable" }, { status: 503 });
    }

    let authContext;
    try {
      authContext = await verifyApiKeyBearer(bearer, keyStore, smokeKey);
    } catch {
      return Response.json({ error: "service_unavailable" }, { status: 503 });
    }
    if (!authContext) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const authInfo = toAuthInfo(
      authContext.bearerToken,
      authContext.verified,
      config.serverUrl,
    );
    const clientRateLimit: ClientRateLimit = {
      rateLimitMax: authContext.verified.rateLimitMax,
      rateLimitWindowSec: authContext.verified.rateLimitWindowSec,
    };

    return clientRateLimitStorage.run(clientRateLimit, () =>
      mcpHandler.fetch(request, { authInfo }),
    );
  };
}
