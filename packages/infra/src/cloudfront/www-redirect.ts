const APEX_HOST_RE = /^[a-z0-9.-]+$/i;

/**
 * CloudFront Function source (JS 2.0) that 301s `www.{apex}` to `https://{apex}`
 * while preserving path and query string. The host is baked in at synth time.
 */
export function wwwRedirectFunctionCode(apexHost: string): string {
  const host = apexHost.trim().toLowerCase();
  if (!APEX_HOST_RE.test(host) || host.startsWith("www.")) {
    throw new Error(`Invalid apex host for www redirect: ${apexHost}`);
  }

  return `function handler(event) {
  var request = event.request;
  var raw = (request.headers.host && request.headers.host.value) || "";
  var hostLower = raw.toLowerCase();
  var needle = "www.${host}";
  if (hostLower !== needle && hostLower.indexOf(needle + ":") !== 0) {
    return request;
  }
  var location = "https://${host}" + request.uri;
  var parts = [];
  var qs = request.querystring;
  for (var key in qs) {
    if (!Object.prototype.hasOwnProperty.call(qs, key)) continue;
    var item = qs[key];
    if (item.multiValue) {
      for (var i = 0; i < item.multiValue.length; i++) {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(item.multiValue[i].value));
      }
    } else if (item.value) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(item.value));
    } else {
      parts.push(encodeURIComponent(key));
    }
  }
  if (parts.length > 0) {
    location += "?" + parts.join("&");
  }
  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: { location: { value: location } }
  };
}
`;
}
