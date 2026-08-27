import {
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Config } from "../config";
import { profileReadScope } from "../config";

/** Redirect URI prefixes allowed for RFC 7591 dynamic client registration. */
export const DCR_REDIRECT_ALLOWLIST_PREFIXES = [
  "https://claude.ai/",
  "https://claude.com/",
  "http://127.0.0.1:",
  "http://localhost:",
] as const;

export type DcrRequestBody = {
  redirect_uris?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
  token_endpoint_auth_method?: unknown;
  client_name?: unknown;
  /** Extra connector fields (ignored): scope, application_type, client_uri, … */
  [key: string]: unknown;
};

export type DcrResult =
  | { ok: true; status: 201; body: Record<string, unknown> }
  | {
      ok: false;
      status: 400 | 500;
      body: { error: string; error_description?: string };
    };

export function isAllowedRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password || parsed.hash) return false;
  const absolute = parsed.href;
  return DCR_REDIRECT_ALLOWLIST_PREFIXES.some((prefix) => absolute.startsWith(prefix));
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string" && item.length > 0)) return null;
  return value;
}

/**
 * RFC 7591 Dynamic Client Registration adapter: creates a Cognito public
 * app client (authorization code + PKCE, no secret) with allowlisted redirects.
 * Unknown body fields from MCP connectors are ignored.
 */
export async function handleDynamicClientRegistration(
  request: Request,
  config: Config,
  cognito: Pick<
    CognitoIdentityProviderClient,
    "send"
  > = new CognitoIdentityProviderClient({
    region: config.cognitoRegion,
  }),
): Promise<DcrResult> {
  let body: DcrRequestBody;
  try {
    body = (await request.json()) as DcrRequestBody;
  } catch {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_client_metadata",
        error_description: "Request body must be JSON",
      },
    };
  }

  const redirectUris = asStringArray(body.redirect_uris);
  if (!redirectUris || redirectUris.length === 0) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris is required",
      },
    };
  }
  if (!redirectUris.every(isAllowedRedirectUri)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris must match the allowlist",
      },
    };
  }

  const authMethod =
    typeof body.token_endpoint_auth_method === "string"
      ? body.token_endpoint_auth_method
      : "none";
  if (authMethod !== "none") {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_client_metadata",
        error_description: "Only token_endpoint_auth_method=none is supported",
      },
    };
  }

  const grantTypes = asStringArray(body.grant_types);
  if (grantTypes !== null && !grantTypes.includes("authorization_code")) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_client_metadata",
        error_description: "grant_types must include authorization_code",
      },
    };
  }

  const responseTypes = asStringArray(body.response_types);
  if (responseTypes !== null && !responseTypes.includes("code")) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "invalid_client_metadata",
        error_description: "response_types must include code",
      },
    };
  }

  const clientName =
    typeof body.client_name === "string" && body.client_name.trim().length > 0
      ? body.client_name.trim().slice(0, 128)
      : "mcp-dcr-client";

  const scope = profileReadScope(config);

  try {
    const result = await cognito.send(
      new CreateUserPoolClientCommand({
        UserPoolId: config.cognitoUserPoolId,
        ClientName: clientName,
        GenerateSecret: false,
        AllowedOAuthFlowsUserPoolClient: true,
        AllowedOAuthFlows: ["code"],
        AllowedOAuthScopes: ["openid", "email", scope],
        CallbackURLs: redirectUris,
        SupportedIdentityProviders: ["COGNITO"],
        ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
        EnableTokenRevocation: true,
        PreventUserExistenceErrors: "ENABLED",
      }),
    );

    const clientId = result.UserPoolClient?.ClientId;
    if (!clientId) {
      return {
        ok: false,
        status: 500,
        body: {
          error: "server_error",
          error_description: "Cognito did not return a client_id",
        },
      };
    }

    return {
      ok: true,
      status: 201,
      body: {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        redirect_uris: redirectUris,
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        client_name: clientName,
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      body: { error: "server_error", error_description: "Failed to register client" },
    };
  }
}

export function isDcrRegistrationRequest(request: Request, serverUrl: URL): boolean {
  if (request.method !== "POST") return false;
  try {
    const url = new URL(request.url);
    return url.pathname === "/register" && url.hostname === serverUrl.hostname;
  } catch {
    return false;
  }
}
