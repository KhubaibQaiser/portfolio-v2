import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFixtureContentRepository } from "@portfolio/data";

const repo = createFixtureContentRepository();
const requireAdmin = vi.fn();
const publishContentChanged = vi.fn();

vi.mock("@portfolio/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@portfolio/data")>()),
  getContentRepository: () => repo,
}));
vi.mock("@/lib/auth-guard", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/content-publish", () => ({
  publishContentChanged: () => publishContentChanged(),
}));

const { approveProjectRevision, rejectProjectRevision } = await import("@/lib/actions");

async function stagedProject() {
  const [seed] = await repo.getProjects();
  const row = await repo.getProjectById(seed!.id);
  await repo.updateProject(
    row.id,
    {
      pending_revision: {
        values: { title: "Agent title" },
        base_revision: row.revision,
        proposed_at: "2026-11-13T00:00:00.000Z",
        proposed_by: "client-1",
      },
    },
    row.revision,
  );
  return { id: row.id, title: row.title };
}

describe("project revision actions", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ ok: true });
    publishContentChanged.mockReset().mockResolvedValue(undefined);
  });

  it("approve applies the staged values, clears them and publishes ContentChanged", async () => {
    const { id } = await stagedProject();

    expect(await approveProjectRevision(id)).toEqual({ success: true });

    const row = await repo.getProjectById(id);
    expect(row.title).toBe("Agent title");
    expect(row.pending_revision).toBeUndefined();
    expect(publishContentChanged).toHaveBeenCalledOnce();
  });

  it("reject clears the staged values and leaves the live row alone", async () => {
    const { id, title } = await stagedProject();

    expect(await rejectProjectRevision(id)).toEqual({ success: true });

    const row = await repo.getProjectById(id);
    expect(row.title).toBe(title);
    expect(row.pending_revision).toBeUndefined();
    expect(publishContentChanged).not.toHaveBeenCalled();
  });

  it("does nothing for a non-admin caller", async () => {
    const { id } = await stagedProject();
    requireAdmin.mockResolvedValue({ ok: false, error: "Unauthorized" });

    expect(await approveProjectRevision(id)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(await rejectProjectRevision(id)).toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect((await repo.getProjectById(id)).pending_revision).toBeDefined();
    expect(publishContentChanged).not.toHaveBeenCalled();
  });
});
