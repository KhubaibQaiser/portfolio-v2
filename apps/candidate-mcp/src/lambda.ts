import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";
import { getContentRepository } from "@portfolio/data";
import { loadConfig } from "./config";
import { createAgentTokenVerifier } from "./auth/verify-agent-token";
import { createHttpHandler } from "./http-handler";

/**
 * Adapts an AWS Lambda Function URL event to the web-standard
 * `Request`/`Response` pair `createHttpHandler` expects. This is the only
 * AWS-specific file in the app — everything else in `src/` is plain
 * web-standard TypeScript, testable without AWS credentials or a Lambda
 * runtime.
 *
 * Config, the repository, and the token verifier are built once per Lambda
 * execution environment (module scope), not per invocation — standard
 * Lambda cold-start-amortization practice, matching `@portfolio/data`'s own
 * memoized `getContentRepository()`.
 */
const config = loadConfig();
const handler = createHttpHandler({
  config,
  repo: getContentRepository(),
  verifier: createAgentTokenVerifier(config),
});

function toWebRequest(event: APIGatewayProxyEventV2): Request {
  const host = event.headers.host ?? new URL(config.serverUrl).host;
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `https://${host}${event.rawPath}${query}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (value !== undefined) headers.set(key, value);
  }
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
  const request = toWebRequest(event);
  const response = await handler(request);
  return toApiGatewayResult(response);
}
