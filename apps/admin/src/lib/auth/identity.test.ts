import { describe, expect, it } from "vitest";
import { mapSessionToIdentity } from "./identity";

describe("mapSessionToIdentity", () => {
  it("maps googleSub to sub and preserves email", () => {
    expect(
      mapSessionToIdentity({
        user: { email: "admin@example.com", googleSub: "google-sub-123" },
      }),
    ).toEqual({ sub: "google-sub-123", email: "admin@example.com" });
  });

  it("returns null when googleSub is missing", () => {
    expect(mapSessionToIdentity({ user: { email: "admin@example.com" } })).toBeNull();
  });

  it("returns null when session is absent", () => {
    expect(mapSessionToIdentity(null)).toBeNull();
  });
});
