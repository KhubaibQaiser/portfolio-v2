import type { APIGatewayProxyEventV2 } from "aws-lambda";

/**
 * Maps a Lambda Function URL event to a web `Request`.
 *
 * CloudFront's `ALL_VIEWER_EXCEPT_HOST_HEADER` origin policy (required so the
 * Function URL accepts the request) replaces the viewer Host
 * (`mcp.example.com`) with the Function URL hostname
 * (`*.lambda-url.*.on.aws`). The MCP SDK's DNS-rebinding check then 403s
 * because that Host is not the public hostname. Always stamp the public
 * Host CloudFront already validated via the custom-domain cert/alias.
 */
export function toWebRequest(event: APIGatewayProxyEventV2, publicHost: string): Request {
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `https://${publicHost}${event.rawPath}${query}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (value !== undefined) headers.set(key, value);
  }
  headers.set("host", publicHost);
  if (event.cookies?.length) {
    headers.set("cookie", event.cookies.join("; "));
  }

  const method = event.requestContext.http.method;
  const hasBody = method !== "GET" && method !== "HEAD" && event.body !== undefined;
  const body = hasBody
    ? event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64")
      : event.body
    : undefined;

  return new Request(url, { method, headers, body });
}
