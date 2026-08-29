import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequestError } from "../instrumentation";

describe("admin instrumentation", () => {
  const previousRuntime = process.env.NEXT_RUNTIME;

  afterEach(() => {
    process.env.NEXT_RUNTIME = previousRuntime;
    vi.restoreAllMocks();
  });

  it("emits JSON ERROR to stdout for unhandled Node requests", () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("boom"), { digest: "abc" });
    onRequestError(
      error,
      { path: "/jobs", method: "GET" },
      { routePath: "/jobs", routeType: "render" },
    );
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0])) as {
      level: string;
      message: string;
      path: string;
      digest: string;
    };
    expect(payload.level).toBe("ERROR");
    expect(payload.message).toBe("unhandled admin request error");
    expect(payload.path).toBe("/jobs");
    expect(payload.digest).toBe("abc");
  });

  it("does not log on the Edge runtime", () => {
    process.env.NEXT_RUNTIME = "edge";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    onRequestError(new Error("boom"), { path: "/jobs", method: "GET" }, {});
    expect(spy).not.toHaveBeenCalled();
  });
});
