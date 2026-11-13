import { describe, expect, it } from "vitest";
import { createFixtureContentRepository } from "@portfolio/data";
import { proposal } from "../test-proposal";
import { proposeProject, type ToolEnv } from "./propose-project";
import {
  getProject,
  listProjects,
  proposeProjectUpdate,
  proposeProjectUpdateInput,
} from "./project-edit";

const env: ToolEnv = {
  mediaBaseUrl: "https://media.example.com",
  adminUrl: "https://admin.example.com/",
};

async function seedPublished(slug: string) {
  const repo = createFixtureContentRepository();
  await proposeProject(repo, proposal(slug), env);
  const row = (await repo.getAllProjects()).find((p) => p.slug === slug)!;
  await repo.updateProject(row.id, { status: "published" }, row.revision);
  const fresh = (await repo.getAllProjects()).find((p) => p.slug === slug)!;
  return { repo, row: fresh };
}

describe("proposeProjectUpdate", () => {
  it("applies an edit to a draft immediately", async () => {
    const repo = createFixtureContentRepository();
    await proposeProject(repo, proposal("draft-a"), env);
    const row = (await repo.getAllProjects()).find((p) => p.slug === "draft-a")!;

    const result = await proposeProjectUpdate(
      repo,
      { slug: "draft-a", base_revision: row.revision, changes: { title: "New title" } },
      env,
      "client-1",
    );

    expect(result).toMatchObject({
      ok: true,
      mode: "applied",
      revision: row.revision + 1,
    });
    expect((await repo.getProjectById(row.id)).title).toBe("New title");
  });

  it("stages an edit to a published project and leaves live fields and public reads untouched", async () => {
    const { repo, row } = await seedPublished("live-a");

    const result = await proposeProjectUpdate(
      repo,
      { slug: "live-a", base_revision: row.revision, changes: { title: "Edited" } },
      env,
      "client-1",
    );

    expect(result).toMatchObject({ ok: true, mode: "staged" });
    const stored = await repo.getProjectById(row.id);
    expect(stored.title).toBe(row.title);
    expect(stored.pending_revision).toMatchObject({
      values: { title: "Edited" },
      base_revision: row.revision,
      proposed_by: "client-1",
    });
    for (const p of [
      ...(await repo.getProjects()),
      ...(await repo.getFeaturedProjects()),
      await repo.getProjectBySlug("live-a"),
    ]) {
      if (p?.slug === "live-a") {
        expect(p).not.toHaveProperty("pending_revision");
        expect(p.title).toBe(row.title);
      }
    }
  });

  it("rejects a stale base_revision without writing", async () => {
    const { repo, row } = await seedPublished("stale-a");

    const result = await proposeProjectUpdate(
      repo,
      { slug: "stale-a", base_revision: row.revision - 1 || 99, changes: { title: "x" } },
      env,
      "c",
    );

    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain("revision conflict");
    expect((await repo.getProjectById(row.id)).pending_revision).toBeUndefined();
  });

  it("lets only one of two concurrent proposals from the same revision win", async () => {
    const { repo, row } = await seedPublished("race-a");

    const results = await Promise.all(
      ["one", "two"].map((title) =>
        proposeProjectUpdate(
          repo,
          { slug: "race-a", base_revision: row.revision, changes: { title } },
          env,
          "c",
        ),
      ),
    );

    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("rejects an unknown slug, an empty change set and an off-host cover", async () => {
    const { repo, row } = await seedPublished("misc-a");
    const base = { slug: "misc-a", base_revision: row.revision };

    expect(
      await proposeProjectUpdate(
        repo,
        { ...base, slug: "nope", changes: { title: "x" } },
        env,
        "c",
      ),
    ).toMatchObject({ ok: false, error: "project not found: nope" });
    expect(
      await proposeProjectUpdate(repo, { ...base, changes: {} }, env, "c"),
    ).toMatchObject({
      ok: false,
    });
    expect(
      await proposeProjectUpdate(
        repo,
        { ...base, changes: { cover_url: "https://evil.example.net/x.png" } },
        env,
        "c",
      ),
    ).toMatchObject({ ok: false });
  });

  it("strictly rejects server-owned and identity fields", () => {
    for (const changes of [
      { status: "published" },
      { sort_order: 0 },
      { is_featured: true },
      { show_in_resume: true },
      { slug: "other" },
      { gallery: [] },
    ]) {
      expect(
        proposeProjectUpdateInput.safeParse({ slug: "a", base_revision: 1, changes })
          .success,
      ).toBe(false);
    }
    expect(
      proposeProjectUpdateInput.safeParse({
        slug: "a",
        base_revision: 1,
        changes: { title: "ok" },
        status: "published",
      }).success,
    ).toBe(false);
  });
});

describe("listProjects / getProject", () => {
  it("lists drafts with revision and pending flag, and gets a project by slug", async () => {
    const { repo, row } = await seedPublished("read-a");
    await proposeProjectUpdate(
      repo,
      { slug: "read-a", base_revision: row.revision, changes: { summary: "Better" } },
      env,
      "c",
    );
    await proposeProject(repo, proposal("read-draft"), env);

    const list = await listProjects(repo);
    expect(list.find((p) => p.slug === "read-a")).toMatchObject({
      status: "published",
      has_pending: true,
    });
    expect(list.find((p) => p.slug === "read-draft")).toMatchObject({ status: "draft" });

    const got = await getProject(repo, "read-a");
    expect(got).toMatchObject({ ok: true });
    expect(got.ok && got.project.pending_revision?.values.summary).toBe("Better");
    expect(await getProject(repo, "missing")).toEqual({
      ok: false,
      error: "project not found: missing",
    });
  });
});
