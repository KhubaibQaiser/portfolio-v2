/**
 * Hostnames allowed in the browser `Origin` header for remote MCP clients.
 * Missing Origin still passes (n8n, curl, CI smoke). Host header validation
 * stays pinned to the public MCP hostname separately.
 *
 * Claude.ai / Desktop connectors may send `claude.ai`, `claude.com`, or
 * `api.anthropic.com`. See ADR 0005 connector notes.
 */
export const MCP_ALLOWED_ORIGIN_HOSTNAMES = [
  "claude.ai",
  "www.claude.ai",
  "claude.com",
  "www.claude.com",
  "api.anthropic.com",
] as const;

/** Public MCP host plus known connector origins for `originValidationResponse`. */
export function mcpAllowedOriginHostnames(serverHostname: string): string[] {
  return [serverHostname, ...MCP_ALLOWED_ORIGIN_HOSTNAMES];
}

/**
 * Returns CORS headers when the request Origin hostname is allowlisted.
 * Echoes the concrete Origin (never `*`) so Authorization can be used.
 */
export function corsHeadersForRequest(
  request: Request,
  allowedOriginHostnames: string[],
): Record<string, string> | undefined {
  const origin = request.headers.get("origin");
  if (!origin) return undefined;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return undefined;
  }
  if (!allowedOriginHostnames.includes(hostname)) return undefined;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** OPTIONS preflight for Claude/browser clients — no Bearer required. */
export function corsPreflightResponse(
  request: Request,
  allowedOriginHostnames: string[],
): Response {
  const cors = corsHeadersForRequest(request, allowedOriginHostnames);
  if (!cors) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: cors });
}

export function withCors(
  request: Request,
  response: Response,
  allowedOriginHostnames: string[],
): Response {
  const cors = corsHeadersForRequest(request, allowedOriginHostnames);
  if (!cors) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
