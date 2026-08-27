import { describe, expect, it } from "vitest";
import { restoreWwwAuthenticateFunctionCode } from "./restore-www-authenticate";

describe("restoreWwwAuthenticateFunctionCode", () => {
  it("copies the Function URL remapped challenge onto WWW-Authenticate", () => {
    const source = restoreWwwAuthenticateFunctionCode();
    expect(source).toContain("x-amzn-remapped-www-authenticate");
    expect(source).toContain("www-authenticate");
    expect(source).toContain("function handler(event)");
  });
});
