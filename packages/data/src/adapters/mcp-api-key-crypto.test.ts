import { describe, expect, it } from "vitest";
import {
  buildApiKeyToken,
  hashApiKey,
  MCP_API_KEY_ID_LEN,
  parseApiKeyToken,
  secretsEqual,
} from "./mcp-api-key-crypto";

describe("mcp-api-key-crypto", () => {
  it("parses tokens when the secret contains base64url underscores", () => {
    const keyId = "a".repeat(MCP_API_KEY_ID_LEN);
    const secret = "abc_def_ghi_jkl";
    const token = buildApiKeyToken(keyId, secret);

    const parsed = parseApiKeyToken(token);
    expect(parsed).toEqual({
      keyId,
      fullToken: token,
      displayPrefix: `mcp_ck_${keyId.slice(0, 8)}…`,
    });
    expect(secretsEqual(hashApiKey(token), hashApiKey(token))).toBe(true);
  });

  it("rejects tokens with a short key id", () => {
    expect(parseApiKeyToken("mcp_ck_short_secret")).toBeNull();
  });
});
