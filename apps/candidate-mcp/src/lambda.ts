import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";
import { getContentRepository } from "@portfolio/data";
import { loadConfig } from "./config";
import { createAgentTokenVerifier } from "./auth/verify-agent-token";
import { createHttpHandler } from "./http-handler";
import { toWebRequest } from "./function-url-to-web-request";

/**
 * Lambda Function URL entry: loads config once per execution environment and
 * adapts events to the web-standard handler. Origin Host rewriting lives in
 * `function-url-to-web-request.ts` (CloudFront strips the custom-domain Host).
 */
const config = loadConfig();
const handler = createHttpHandler({
  config,
  repo: getContentRepository(),
  verifier: createAgentTokenVerifier(config),
});

async function toApiGatewayResult(
  response: Response,
): Promise<APIGatewayProxyStructuredResultV2> {
  const headers: Record<string, string> = {};
  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value);
    } else {
      headers[key] = value;
    }
  });

  return {
    statusCode: response.status,
    headers,
    cookies: cookies.length > 0 ? cookies : undefined,
    body: await response.text(),
    isBase64Encoded: false,
  };
}

export async function lambdaHandler(
  event: APIGatewayProxyEventV2,
  _context: Context,
): Promise<APIGatewayProxyStructuredResultV2> {
  const request = toWebRequest(event, new URL(config.serverUrl).host);
  const response = await handler(request);
  return toApiGatewayResult(response);
}
