import { z } from "zod";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { ContentConflictError } from "@portfolio/shared/concurrency";
import type { ContentRepository } from "@portfolio/shared/ports";
import { projectContentPatchSchema } from "@portfolio/shared/schemas";
import type { Project } from "@portfolio/shared/schemas";
import { deepSanitize } from "../sanitize";
import { withGuardrails } from "../tool-wrapper";
import type { ClientRateLimit } from "../config";
import { isAllowedCoverUrl, type ToolEnv } from "./propose-project";

/**
 * Read and edit tools for existing projects (ADR 0010). No delete, publish,
 * feature, reorder or slug change exists here. A published project is never
 * changed directly: the edit is staged as `pending_revision` until an Admin
 * approves it. Drafts are already hidden, so edits to them apply directly.
 */

export const proposeProjectUpdateInput = z
  .object({
    slug: projectSlug(),
    /** `revision` from `get_project`; a stale value is rejected. */
    base_revision: z.number().int().min(1),
    changes: projectContentPatchSchema,
  })
  .strict();

export type ProposeProjectUpdateInput = z.infer<typeof proposeProjectUpdateInput>;

function projectSlug() {
  return z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/);
}

export type ProjectSummary = {
  slug: string;
  title: string;
  summary: string;
  status: "draft" | "published";
  revision: number;
  has_pending: boolean;
};

export async function listProjects(repo: ContentRepository): Promise<ProjectSummary[]> {
  const rows = await repo.getAllProjects();
  return deepSanitize(
    rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      status: p.status,
      revision: p.revision,
      has_pending: Boolean(p.pending_revision),
    })),
  );
}

export type GetProjectResult =
  | { ok: true; project: Omit<Project, "id" | "created_at"> }
  | { ok: false; error: string };

export async function getProject(
  repo: ContentRepository,
  slug: string,
): Promise<GetProjectResult> {
  const row = (await repo.getAllProjects()).find((p) => p.slug === slug);
  if (!row) return { ok: false, error: `project not found: ${slug}` };
  const { id: _id, created_at: _created, ...project } = row;
  return { ok: true, project: deepSanitize(project) };
}

export type ProposeProjectUpdateResult =
  | { ok: true; mode: "applied" | "staged"; revision: number; reviewUrl: string | null }
  | { ok: false; error: string };

/** Pure edit logic; no HTTP or auth, so it is unit-testable on the fixture repo. */
export async function proposeProjectUpdate(
  repo: ContentRepository,
  rawInput: ProposeProjectUpdateInput,
  env: ToolEnv,
  clientId: string,
): Promise<ProposeProjectUpdateResult> {
  const { slug, base_revision, changes } = deepSanitize(rawInput);

  if (Object.keys(changes).length === 0) {
    return { ok: false, error: "changes must include at least one field" };
  }
  if (
    changes.cover_url !== undefined &&
    !isAllowedCoverUrl(changes.cover_url, env.mediaBaseUrl)
  ) {
    return {
      ok: false,
      error: "cover_url must be an https URL on the site's media host",
    };
  }

  const row = (await repo.getAllProjects()).find((p) => p.slug === slug);
  if (!row) return { ok: false, error: `project not found: ${slug}` };
  const conflict = {
    ok: false as const,
    error: `revision conflict: ${slug} is at revision ${row.revision}; call get_project and retry`,
  };
  if (row.revision !== base_revision) return conflict;

  const reviewUrl = env.adminUrl ? `${env.adminUrl.replace(/\/$/, "")}/projects` : null;
  const mode = row.status === "draft" ? "applied" : "staged";

  try {
    await repo.updateProject(
      row.id,
      mode === "applied"
        ? changes
        : {
            pending_revision: {
              values: changes,
              base_revision,
              proposed_at: new Date().toISOString(),
              proposed_by: clientId,
            },
          },
      row.revision,
    );
  } catch (error) {
    if (error instanceof ContentConflictError) return conflict;
    throw error;
  }

  return { ok: true, mode, revision: row.revision + 1, reviewUrl };
}

const text = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  isError,
});

export function registerProjectEditTools(
  server: McpServer,
  repo: ContentRepository,
  authInfo: AuthInfo | undefined,
  rateLimit: ClientRateLimit,
  env: ToolEnv,
): void {
  const readOnly = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      annotations: readOnly,
      description:
        "List every project (drafts included) with its slug, status, revision and whether an edit is awaiting approval. Read-only.",
      inputSchema: z.object({}),
    },
    withGuardrails("list_projects", authInfo, rateLimit, async () =>
      text(await listProjects(repo)),
    ),
  );

  server.registerTool(
    "get_project",
    {
      title: "Get project",
      annotations: readOnly,
      description:
        "Read one project by slug, including its revision (needed for propose_project_update) and any pending edit. Read-only.",
      inputSchema: z.object({ slug: projectSlug() }).strict(),
    },
    withGuardrails("get_project", authInfo, rateLimit, async (args: { slug: string }) => {
      const result = await getProject(repo, args.slug);
      return text(result, !result.ok);
    }),
  );

  server.registerTool(
    "propose_project_update",
    {
      title: "Propose project update",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      description:
        "Propose changes to an existing project's content (not its slug, status, order or featured flags). A published project is NOT changed: the edit waits for the owner's approval in the Admin panel. Edits to a draft apply immediately. Pass the revision from get_project. Cannot delete or publish.",
      inputSchema: proposeProjectUpdateInput,
    },
    withGuardrails(
      "propose_project_update",
      authInfo,
      rateLimit,
      async (args: ProposeProjectUpdateInput) => {
        const result = await proposeProjectUpdate(
          repo,
          args,
          env,
          authInfo?.clientId ?? "stdio",
        );
        return text(result, !result.ok);
      },
    ),
  );
}
