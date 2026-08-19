import { beforeEach, describe, expect, it, vi } from "vitest";
import { withGuardrails } from "./tool-wrapper";
import { checkRateLimit } from "./rate-limit";
import { auditToolCall } from "./audit-log";

vi.mock("./rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("./audit-log", () => ({ auditToolCall: vi.fn() }));

const config = { rateLimitMax: 30, rateLimitWindowSec: 60 };
const authInfo = { token: "t", clientId: "n8n-workflow", scopes: ["profile.read"] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("withGuardrails", () => {
  it("calls the handler and audits success when under the rate limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true });
    const handler = vi
      .fn()
      .mockResolvedValue({ content: [{ type: "text", text: "ok" }] });

    const result = await withGuardrails(
      "get_candidate_profile",
      authInfo,
      config,
      handler,
    )();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ content: [{ type: "text", text: "ok" }] });
    expect(auditToolCall).toHaveBeenCalledWith({
      tool: "get_candidate_profile",
      clientId: "n8n-workflow",
      scopes: ["profile.read"],
      ok: true,
    });
  });

  it("short-circuits with an isError tool result when rate-limited, without calling the handler", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfterSeconds: 12 });
    const handler = vi.fn();

    const result = await withGuardrails(
      "get_candidate_profile",
      authInfo,
      config,
      handler,
    )();

    expect(handler).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ text: expect.stringContaining("12s") });
    expect(auditToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, reason: "rate_limited" }),
    );
  });

  it("falls back to a fixed 'stdio' client id when no authInfo is present", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true });
    const handler = vi.fn().mockResolvedValue({ content: [] });

    await withGuardrails("get_candidate_facts", undefined, config, handler)();

    expect(checkRateLimit).toHaveBeenCalledWith("stdio", config);
  });

  it("audits and rethrows when the handler throws", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true });
    const handler = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      withGuardrails("get_candidate_profile", authInfo, config, handler)(),
    ).rejects.toThrow("boom");
    expect(auditToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, reason: "boom" }),
    );
  });
});
