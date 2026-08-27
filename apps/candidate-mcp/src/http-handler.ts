import {
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  hostHeaderValidationResponse,
  oauthMetadataResponse,
  originValidationResponse,
  requireBearerAuth,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import {
  corsPreflightResponse,
  mcpAllowedOriginHostnames,
  withCors,
} from "./allowed-origins";
import { handleDynamicClientRegistration, isDcrRegistrationRequest } from "./auth/dcr";
import { getViewerIp } from "./auth/viewer-ip";
import { buildAuthMetadataOptions } from "./oauth-metadata";
import { originVerifyResponse } from "./origin-verify";
import { profileReadScope, type Config } from "./config";
import { createCandidateMcpServer } from "./server";
import { checkIpRateLimit } from "./ip-rate-limit";

export type HttpHandlerDeps = {
  config: Config;
  repo: ContentRepository;
  verifier: OAuthTokenVerifier;
};

/**
 * Origin-verify → kill switch → Host/Origin → OPTIONS → public OAuth discovery
 * → IP rate limit → DCR → Bearer gate → MCP. See ADR 0006.
 */
export function createHttpHandler(
  deps: HttpHandlerDeps,
): (request: Request) => Promise<Response> {
  const { config, repo, verifier } = deps;
  const serverUrl = new URL(config.serverUrl);
  const allowedHostnames = [serverUrl.hostname];
  const allowedOriginHostnames = mcpAllowedOriginHostnames(serverUrl.hostname);
  const authMetadata = buildAuthMetadataOptions(config);
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(serverUrl);
  const clientRateLimit = {
    rateLimitMax: config.rateLimitMax,
    rateLimitWindowSec: config.rateLimitWindowSec,
  };

  const gate = requireBearerAuth({
    verifier,
    requiredScopes: [profileReadScope(config)],
    resourceMetadataUrl,
  });

  const mcpHandler = createMcpHandler((ctx) =>
    createCandidateMcpServer(repo, ctx.authInfo, clientRateLimit),
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

    if (request.method === "OPTIONS") {
      return corsPreflightResponse(request, allowedOriginHostnames);
    }

    const metadataResponse = oauthMetadataResponse(request, authMetadata);
    if (metadataResponse) return respond(metadataResponse);

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

    if (isDcrRegistrationRequest(request, serverUrl)) {
      const dcr = await handleDynamicClientRegistration(request, config);
      return respond(Response.json(dcr.body, { status: dcr.status }));
    }

    const auth = await gate(request);
    if (auth instanceof Response) return respond(auth);

    return respond(await mcpHandler.fetch(request, { authInfo: auth }));
  };
}
