/**
 * Edge-safe Cognito OAuth helpers: Hosted UI URL builders and token-endpoint
 * calls. Used by both the Node route handlers and the edge middleware, so this
 * module must stay free of `node:*` and `aws-jwt-verify` imports.
 */

export type TokenSet = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  /** Lifetime of the id/access tokens in seconds. */
  expiresIn: number;
};

type OAuthConfig = { domain: string; clientId: string };

/** Reads the Hosted UI domain + client id from the env (throws when unset). */
export function getOAuthConfig(): OAuthConfig {
  const domain = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!domain || !clientId) {
    throw new Error(
      "Cognito OAuth is not configured: set COGNITO_DOMAIN and COGNITO_CLIENT_ID.",
    );
  }
  return { domain: domain.replace(/\/+$/, ""), clientId };
}

const SCOPES = "openid email profile";

export function buildAuthorizeUrl(opts: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const { domain, clientId } = getOAuthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    scope: SCOPES,
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${domain}/oauth2/authorize?${params.toString()}`;
}

export function buildLogoutUrl(logoutUri: string): string {
  const { domain, clientId } = getOAuthConfig();
  const params = new URLSearchParams({ client_id: clientId, logout_uri: logoutUri });
  return `${domain}/logout?${params.toString()}`;
}

type TokenResponse = {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function postToken(body: URLSearchParams): Promise<TokenSet> {
  const { domain } = getOAuthConfig();
  const res = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Cognito token endpoint returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export function exchangeCodeForTokens(opts: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenSet> {
  const { clientId } = getOAuthConfig();
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: opts.code,
      redirect_uri: opts.redirectUri,
      code_verifier: opts.codeVerifier,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const { clientId } = getOAuthConfig();
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  );
}
