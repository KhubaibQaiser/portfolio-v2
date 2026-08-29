import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loggerError: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import { onRequestError } from "../instrumentation";

describe("admin instrumentation", () => {
  const previousRuntime = process.env.NEXT_RUNTIME;

  afterEach(() => {
    process.env.NEXT_RUNTIME = previousRuntime;
    mocks.loggerError.mockReset();
  });

  it("logs a structured ERROR for unhandled Node requests", () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const error = Object.assign(new Error("boom"), { digest: "abc" });
    onRequestError(
      error,
      { path: "/jobs", method: "GET" },
      { routePath: "/jobs", routeType: "render" },
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "unhandled admin request error",
      expect.objectContaining({
        digest: "abc",
        method: "GET",
        path: "/jobs",
        routePath: "/jobs",
        routeType: "render",
        error: expect.any(Error),
      }),
    );
  });

  it("does not log on the Edge runtime", () => {
    process.env.NEXT_RUNTIME = "edge";
    onRequestError(new Error("boom"), { path: "/jobs", method: "GET" }, {});
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });
});
