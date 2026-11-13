import { describe, expect, it } from "vitest";
import { ORIGIN_VERIFY_HEADER, originVerifyResponse } from "./origin-verify";

const SECRET = "test-origin-verify-secret-value";

function requestWith(headerValue: string | undefined): Request {
  const headers = new Headers();
  if (headerValue !== undefined) headers.set(ORIGIN_VERIFY_HEADER, headerValue);
  return new Request("https://mcp.example.com/mcp", { method: "POST", headers });
}

describe("originVerifyResponse", () => {
  it("allows a matching origin-verify header", () => {
    expect(originVerifyResponse(requestWith(SECRET), SECRET)).toBeUndefined();
  });

  it("rejects a missing header, a wrong secret, and a missing expected secret as the same 403", () => {
    const missing = originVerifyResponse(requestWith(undefined), SECRET);
    const wrong = originVerifyResponse(requestWith("nope"), SECRET);
    const unset = originVerifyResponse(requestWith(SECRET), null);

    expect(missing?.status).toBe(403);
    expect(wrong?.status).toBe(403);
    expect(unset?.status).toBe(403);
  });
});
