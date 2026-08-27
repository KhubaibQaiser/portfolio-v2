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
import {
  corsPreflightResponse,
  mcpAllowedOriginHostnames,
  withCors,
} from "./allowed-origins";
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
 * origin-verify → kill switch → Host + Origin allowlist → CORS preflight →
 * per-IP limit → API-key gate → MCP dispatch. No OAuth discovery (ADR 0005).
 *
 * Host stays pinned to the public MCP hostname. Origin allowlist also includes
 * known Claude connector hosts so browser `Origin` headers are not 403'd.
 */
export function createHttpHandler(
  deps: HttpHandlerDeps,
): (request: Request) => Promise<Response> {
  const { config, repo, keyStore, getSmokeKey } = deps;
  const serverUrl = new URL(config.serverUrl);
  const allowedHostnames = [serverUrl.hostname];
  const allowedOriginHostnames = mcpAllowedOriginHostnames(serverUrl.hostname);

  const mcpHandler = createMcpHandler((ctx) =>
    createCandidateMcpServer(repo, ctx.authInfo, {
      rateLimitMax: config.rateLimitMax,
      rateLimitWindowSec: config.rateLimitWindowSec,
    }),
  );

  return async function fetch(request: Request): Promise<Response> {
    const respond = (response: Response) =>
      withCors(request, response, allowedOriginHostnames);

    const originRejected = originVerifyResponse(request, config.originVerifySecret);
    if (originRejected) return respond(originRejected);

    if (!config.enabled) {
      return respond(Response.json({ error: "service_unavailable" }, { status: 503 }));
    }

    const rejected =
      hostHeaderValidationResponse(request, allowedHostnames) ??
      originValidationResponse(request, allowedOriginHostnames);
    if (rejected) return respond(rejected);

    // Browser / Claude UI preflight — must succeed without Authorization.
    if (request.method === "OPTIONS") {
      return corsPreflightResponse(request, allowedOriginHostnames);
    }

    let ipLimit;
    try {
      ipLimit = await checkIpRateLimit(getViewerIp(request), config);
    } catch {
      return respond(Response.json({ error: "service_unavailable" }, { status: 503 }));
    }
    if (!ipLimit.ok) {
      return respond(
        Response.json(
          { error: "rate_limited", retryAfterSeconds: ipLimit.retryAfterSeconds },
          {
            status: 429,
            headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
          },
        ),
      );
    }

    const bearer = parseBearerToken(request);
    if (!bearer) {
      return respond(Response.json({ error: "unauthorized" }, { status: 401 }));
    }

    let smokeKey: SmokeKeyConfig | undefined;
    try {
      smokeKey = getSmokeKey ? await getSmokeKey() : undefined;
    } catch {
      return respond(Response.json({ error: "service_unavailable" }, { status: 503 }));
    }

    let authContext;
    try {
      authContext = await verifyApiKeyBearer(bearer, keyStore, smokeKey);
    } catch {
      return respond(Response.json({ error: "service_unavailable" }, { status: 503 }));
    }
    if (!authContext) {
      return respond(Response.json({ error: "unauthorized" }, { status: 401 }));
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

    const mcpResponse = await clientRateLimitStorage.run(clientRateLimit, () =>
      mcpHandler.fetch(request, { authInfo }),
    );
    return respond(mcpResponse);
  };
}
