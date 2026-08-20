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
import { buildAuthMetadataOptions } from "./oauth-metadata";
import { originVerifyResponse } from "./origin-verify";
import { profileReadScope, type Config } from "./config";
import { createCandidateMcpServer } from "./server";

export type HttpHandlerDeps = {
  config: Config;
  repo: ContentRepository;
  verifier: OAuthTokenVerifier;
};

/**
 * Assembles this server's web-standard `fetch(request) => Response` handler:
 * origin-verify → kill switch → Host/Origin validation → RFC 9728/8414
 * discovery → Bearer-token gate → MCP dispatch. Framework-free
 * (`Request`/`Response` only) so the same function is unit-testable
 * in-memory and directly usable from the Lambda Function URL adapter
 * (`lambda.ts`).
 */
export function createHttpHandler(
  deps: HttpHandlerDeps,
): (request: Request) => Promise<Response> {
  const { config, repo, verifier } = deps;
  const serverUrl = new URL(config.serverUrl);
  const allowedHostnames = [serverUrl.hostname];
  const authMetadata = buildAuthMetadataOptions(config);
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(serverUrl);

  const gate = requireBearerAuth({
    verifier,
    requiredScopes: [profileReadScope(config)],
    resourceMetadataUrl,
  });

  const mcpHandler = createMcpHandler((ctx) =>
    createCandidateMcpServer(repo, ctx.authInfo, config),
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

    const metadataResponse = oauthMetadataResponse(request, authMetadata);
    if (metadataResponse) return metadataResponse;

    const auth = await gate(request);
    if (auth instanceof Response) return auth;

    return mcpHandler.fetch(request, { authInfo: auth });
  };
}
