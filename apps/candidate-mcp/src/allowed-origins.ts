/**
 * Hostnames allowed in the browser `Origin` header for remote MCP clients.
 * Missing Origin still passes (n8n, curl, CI smoke). Host header validation
 * stays pinned to the public MCP hostname separately.
 *
 * Claude.ai custom connectors send `Origin: https://claude.ai`; Anthropic
 * tooling may use `api.anthropic.com`. See ADR 0005 connector notes.
 */
export const MCP_ALLOWED_ORIGIN_HOSTNAMES = ["claude.ai", "api.anthropic.com"] as const;

/** Public MCP host plus known connector origins for `originValidationResponse`. */
export function mcpAllowedOriginHostnames(serverHostname: string): string[] {
  return [serverHostname, ...MCP_ALLOWED_ORIGIN_HOSTNAMES];
}
