/**
 * CloudFront Function source (JS 2.0) that restores `WWW-Authenticate` after
 * Lambda Function URLs remap it to `x-amzn-remapped-www-authenticate`.
 * MCP unauthenticated clients follow RFC 9728 via that challenge header.
 */
export function restoreWwwAuthenticateFunctionCode(): string {
  return `function handler(event) {
  var response = event.response;
  var headers = response.headers;
  var remapped = headers["x-amzn-remapped-www-authenticate"];
  if (remapped && remapped.value && !headers["www-authenticate"]) {
    headers["www-authenticate"] = { value: remapped.value };
  }
  delete headers["x-amzn-remapped-www-authenticate"];
  return response;
}
`;
}
