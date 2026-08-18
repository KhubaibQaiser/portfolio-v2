import { describe, expect, it } from "vitest";
import { wwwRedirectFunctionCode } from "./www-redirect";

describe("wwwRedirectFunctionCode", () => {
  it("bakes the apex host into a CloudFront Function handler", () => {
    const code = wwwRedirectFunctionCode("khubaibqaiser.com");
    expect(code).toContain("function handler(event)");
    expect(code).toContain('var needle = "www.khubaibqaiser.com"');
    expect(code).toContain('var location = "https://khubaibqaiser.com" + request.uri');
    expect(code).toContain("statusCode: 301");
  });

  it("rejects hosts that are not a safe DNS name", () => {
    expect(() => wwwRedirectFunctionCode("www.example.com")).toThrow(/Invalid apex host/);
    expect(() => wwwRedirectFunctionCode('evil.com"; alert(1)')).toThrow(
      /Invalid apex host/,
    );
  });
});
