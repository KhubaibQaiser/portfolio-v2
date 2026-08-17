import { describe, expect, it } from "vitest";
import { isProviderRateLimitError, isRequestTooLargeError } from "./errors";

describe("isRequestTooLargeError", () => {
  it("matches HTTP 413", () => {
    expect(isRequestTooLargeError({ statusCode: 413 })).toBe(true);
    expect(isRequestTooLargeError({ status: 413 })).toBe(true);
  });

  it("matches Groq TPM wording even when the body mentions billing", () => {
    expect(
      isRequestTooLargeError(
        new Error(
          "Request too large for model. Please reduce tokens per minute. See https://console.groq.com/settings/billing",
        ),
      ),
    ).toBe(true);
  });

  it("does not match unrelated billing failures", () => {
    expect(isRequestTooLargeError({ statusCode: 402, message: "billing" })).toBe(false);
    expect(isRequestTooLargeError(new Error("insufficient credits"))).toBe(false);
  });
});

describe("isProviderRateLimitError", () => {
  it("skips the current model on 413 the same way as 429", () => {
    expect(isProviderRateLimitError({ statusCode: 413 })).toBe(true);
    expect(isProviderRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isProviderRateLimitError({ statusCode: 401 })).toBe(false);
  });
});
