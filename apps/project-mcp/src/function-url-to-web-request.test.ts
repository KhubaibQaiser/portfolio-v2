import { describe, expect, it } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { toWebRequest } from "./function-url-to-web-request";

const PUBLIC_HOST = "mcp.example.com";
const FUNCTION_URL_HOST = "abc123.lambda-url.eu-west-1.on.aws";

function functionUrlEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/mcp",
    rawQueryString: "",
    headers: {
      host: FUNCTION_URL_HOST,
      "content-type": "application/json",
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "url-id",
      domainName: FUNCTION_URL_HOST,
      domainPrefix: "abc123",
      http: {
        method: "POST",
        path: "/mcp",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "curl",
      },
      requestId: "id",
      routeKey: "$default",
      stage: "$default",
      time: "20/Aug/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
    body: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}',
    ...overrides,
  };
}

describe("toWebRequest", () => {
  it("replaces the Function URL Host with the public custom-domain Host", () => {
    const request = toWebRequest(functionUrlEvent(), PUBLIC_HOST);

    expect(request.headers.get("host")).toBe(PUBLIC_HOST);
    expect(new URL(request.url).host).toBe(PUBLIC_HOST);
    expect(new URL(request.url).pathname).toBe("/mcp");
  });
});
