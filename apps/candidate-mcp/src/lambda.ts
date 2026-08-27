import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";
import { getContentRepository, getMcpApiKeyStore } from "@portfolio/data";
import { loadConfig } from "./config";
import { loadSmokeKeyConfig } from "./auth/smoke-key";
import { createHttpHandler } from "./http-handler";
import { toWebRequest } from "./function-url-to-web-request";

/**
 * Lambda Function URL entry: loads config once per execution environment and
 * adapts events to the web-standard handler. Origin Host rewriting lives in
 * `function-url-to-web-request.ts` (CloudFront replaces Host with the Function
 * URL hostname).
 */
const config = loadConfig();
if (!config.originVerifySecret) {
  throw new Error("Missing required environment variable: ORIGIN_VERIFY_SECRET");
}

const getSmokeKey = loadSmokeKeyConfig(config.smokeTestKeySecretArn ?? undefined, {
  rateLimitMax: config.smokeTestRateLimitMax,
  rateLimitWindowSec: config.smokeTestRateLimitWindowSec,
});

const handler = createHttpHandler({
  config,
  repo: getContentRepository(),
  keyStore: getMcpApiKeyStore(),
  getSmokeKey,
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
