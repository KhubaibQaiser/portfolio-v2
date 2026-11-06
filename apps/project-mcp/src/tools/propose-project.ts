import { z } from "zod";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import type { ContentRepository } from "@portfolio/shared/ports";
import { projectSchema } from "@portfolio/shared/schemas";
import { deepSanitize } from "../sanitize";
import { withGuardrails } from "../tool-wrapper";
import type { ClientRateLimit } from "../config";

/**
 * Fields the caller may set. `status`, `sort_order`, `is_featured` and
 * `show_in_resume` are server-owned (ADR 0008): an agent can propose a project
 * but cannot publish, order, feature, or put it on the resume. `.strict()`
 * rejects anything else instead of silently dropping it.
 */
export const proposeProjectInput = projectSchema
  .omit({ status: true, sort_order: true, is_featured: true, show_in_resume: true })
  .strict();

export type ProposeProjectInput = z.infer<typeof proposeProjectInput>;

export type ToolEnv = {
  /** `MEDIA_PUBLIC_BASE_URL`; the only host a `cover_url` may point at. */
  mediaBaseUrl: string | null;
  /** Public admin origin used to build the review link. */
  adminUrl: string | null;
};

export function readToolEnv(): ToolEnv {
  return {
    mediaBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL ?? null,
    adminUrl: process.env.ADMIN_URL ?? null,
  };
}

/** Stored, never fetched (ADR 0003 SSRF rule): host must be our media origin. */
export function isAllowedCoverUrl(url: string, mediaBaseUrl: string | null): boolean {
  if (!mediaBaseUrl) return false;
  try {
    const cover = new URL(url);
    return cover.protocol === "https:" && cover.hostname === new URL(mediaBaseUrl).hostname;
  } catch {
    return false;
  }
}

export type ProposeProjectResult =
  | { ok: true; id: string; slug: string; status: "draft"; reviewUrl: string | null }
  | { ok: false; error: string };

/** Pure create-draft logic; no HTTP or auth, so it is unit-testable on the fixture repo. */
export async function proposeProject(
  repo: ContentRepository,
  rawInput: ProposeProjectInput,
  env: ToolEnv,
): Promise<ProposeProjectResult> {
  const input = deepSanitize(rawInput);

  if (input.cover_url !== null && !isAllowedCoverUrl(input.cover_url, env.mediaBaseUrl)) {
    return {
      ok: false,
      error: "cover_url must be null or an https URL on the site's media host",
    };
  }

  const existing = await repo.getAllProjects();
  if (existing.some((p) => p.slug === input.slug)) {
    return { ok: false, error: `slug already exists: ${input.slug}` };
  }

  const row = await repo.insertProject({
    ...input,
    sort_order: existing.length,
    is_featured: false,
    show_in_resume: false,
    status: "draft",
  });

  return {
    ok: true,
    id: row.id,
    slug: row.slug,
    status: "draft",
    reviewUrl: env.adminUrl ? `${env.adminUrl.replace(/\/$/, "")}/projects` : null,
  };
}

export function registerProposeProjectTool(
  server: McpServer,
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  rateLimit: ClientRateLimit,
  env: ToolEnv,
): void {
  server.registerTool(
    "propose_project",
    {
      description:
        "Propose a new portfolio project. It is saved as a DRAFT and stays hidden from the public site until the owner approves it in the Admin panel. Cannot publish, edit, delete, or feature projects.",
      inputSchema: proposeProjectInput,
    },
    withGuardrails("propose_project", authInfo, rateLimit, async (args: ProposeProjectInput) => {
      const result = await proposeProject(repo, args, env);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        isError: !result.ok,
      };
    }),
  );
}
