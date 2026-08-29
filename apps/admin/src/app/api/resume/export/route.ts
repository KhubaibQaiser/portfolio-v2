import { NextResponse } from "next/server";
import { z } from "zod";
import { coverLetterSchema, resumeExportRequestSchema } from "@portfolio/ai/schemas";
import { sanitizeLlmObject } from "@portfolio/ai/guardrails/output-sanitize";
import { enforceResumeGenerationPolicy } from "@portfolio/ai/policy/resume-generation-policy";
import { getResumeData } from "@portfolio/shared/resume-data";
import {
  getContentRepository,
  getRenderJobQueue,
  getRenderJobStore,
} from "@portfolio/data";
import type { RenderJobKind } from "@portfolio/shared/ports";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";
import { logRouteError } from "@/lib/log-route-error";
import { createGenerationSnapshot } from "@/lib/resume-ai/generation-snapshot";
import { loadCandidateFactsUncached } from "@/lib/resume-ai/load-candidate-facts";
import { buildResumeExportFilename } from "@/lib/resume-ai/export-filename";
import { processRenderJob, safeFileName } from "@/lib/resume-ai/process-render-job";
import type {
  CoverLetterRenderJobPayload,
  ResumeRenderJobPayload,
} from "@/lib/resume-ai/render-job-payload";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.discriminatedUnion("kind", [
  resumeExportRequestSchema.extend({
    kind: z.literal("resume"),
  }),
  z
    .object({
      kind: z.literal("cover_letter"),
      generationId: z.string().min(1),
      coverLetter: coverLetterSchema.strict(),
      meta: z
        .object({
          company: z.string().max(200).optional(),
          role: z.string().max(200).optional(),
        })
        .optional(),
    })
    .strict(),
]);

function numericClaims(value: string): string[] {
  return value.match(/[$€£]?\d[\d,.]*(?:%|x|k|m|b)?/gi) ?? [];
}

/**
 * Enqueues an async PDF render job instead of rendering inline (see
 * docs/adr — the resume-generation re-architecture plan). All the request
 * validation that used to gate a synchronous render (freshness hashes,
 * policy enforcement, fact checks) still happens here, fast and
 * synchronously; only the actual (potentially slow) render moves to a
 * worker off any CloudFront/Lambda-timeout path. Poll status at
 * `/api/resume/export/status` and fetch bytes at
 * `/api/resume/export/download` once ready.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    const fields = z.flattenError(parsedBody.error).fieldErrors;
    return NextResponse.json(
      {
        error: {
          code: "INVALID_EXPORT_REQUEST",
          message: "Complete all required resume fields before exporting.",
          fields,
        },
      },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  const repo = getContentRepository();
  const generation = await repo.getResumeGenerationById(body.generationId);
  if (!generation || generation.created_by !== auth.id || generation.deleted_at) {
    return NextResponse.json(
      {
        error: {
          code: "GENERATION_NOT_FOUND",
          message: "This generation is unavailable or does not belong to you.",
          fields: {},
        },
      },
      { status: 404 },
    );
  }
  const base = await getResumeData(repo);

  logger.info("resume pdf export requested", {
    userId: auth.id,
    kind: body.kind,
  });

  let kind: RenderJobKind;
  let payload: ResumeRenderJobPayload | CoverLetterRenderJobPayload;
  let filename: string;

  try {
    if (body.kind === "resume") {
      if (!generation.source_snapshot) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_SOURCE",
              message:
                "This legacy generation has no verified source snapshot. Regenerate it before exporting.",
              fields: {},
            },
          },
          { status: 409 },
        );
      }
      const layouts = await repo.getResumeLayouts().catch(() => []);
      const layout = layouts.find((item) => item.id === body.layoutId);
      if (!layout || generation.layout_id !== body.layoutId) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_LAYOUT",
              message: "The selected layout does not match this generation.",
              fields: { layoutId: ["Regenerate for the selected layout."] },
            },
          },
          { status: 409 },
        );
      }
      const facts = await loadCandidateFactsUncached();
      const currentSnapshot = createGenerationSnapshot(
        facts,
        layout.guidelines,
        layout.version,
      );
      if (
        body.sourceHash !== generation.source_snapshot.sourceHash ||
        body.sourceHash !== currentSnapshot.sourceHash
      ) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_SOURCE",
              message:
                "Candidate source data changed after generation. Regenerate before exporting.",
              fields: {},
            },
          },
          { status: 409 },
        );
      }
      if (
        body.guidelineHash !== generation.source_snapshot.guidelineHash ||
        body.guidelineHash !== currentSnapshot.guidelineHash
      ) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_LAYOUT",
              message:
                "Layout guidance changed after generation. Regenerate before exporting.",
              fields: {},
            },
          },
          { status: 409 },
        );
      }
      const tailored = enforceResumeGenerationPolicy(
        sanitizeLlmObject(body.resume),
        facts,
        layout.guidelines,
        { layoutComponentKey: layout.component_key },
      ).resume;
      kind = "resume";
      payload = { layoutId: body.layoutId, tailoredResume: tailored };
      filename = buildResumeExportFilename(
        base.name,
        layout,
        generation.company ?? undefined,
        base.title,
      );
    } else {
      const letter = coverLetterSchema
        .strict()
        .parse(sanitizeLlmObject(body.coverLetter));
      if (!generation.source_snapshot || !generation.layout_id) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_SOURCE",
              message:
                "This legacy cover letter has no verified source snapshot. Regenerate it before exporting.",
              fields: {},
            },
          },
          { status: 409 },
        );
      }
      const coverLayout = await repo.getResumeLayoutById(generation.layout_id);
      if (!coverLayout) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_LAYOUT",
              message: "The generation layout no longer exists.",
              fields: {},
            },
          },
          { status: 409 },
        );
      }
      const coverFacts = await loadCandidateFactsUncached();
      const coverSnapshot = createGenerationSnapshot(
        coverFacts,
        coverLayout.guidelines,
        coverLayout.version,
      );
      if (coverSnapshot.sourceHash !== generation.source_snapshot.sourceHash) {
        return NextResponse.json(
          {
            error: {
              code: "STALE_SOURCE",
              message:
                "Candidate source data changed after generation. Regenerate before exporting.",
              fields: {},
            },
          },
          { status: 409 },
        );
      }
      const sourceNumbers = new Set(
        numericClaims(coverFacts.factSheet).map((claim) => claim.toLocaleLowerCase()),
      );
      const unsupportedNumbers = numericClaims(
        [letter.greeting, ...letter.body, letter.closing, letter.signOff].join(" "),
      ).filter((claim) => !sourceNumbers.has(claim.toLocaleLowerCase()));
      if (unsupportedNumbers.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: "FACT_VALIDATION_FAILED",
              message: "The edited cover letter contains unsupported numeric claims.",
              fields: {
                coverLetter: [
                  `Remove or verify: ${[...new Set(unsupportedNumbers)].join(", ")}`,
                ],
              },
            },
          },
          { status: 422 },
        );
      }
      kind = "cover_letter";
      payload = {
        letter,
        meta: { company: body.meta?.company, role: body.meta?.role },
      };
      filename =
        safeFileName([base.name, body.meta?.company, body.meta?.role, "Cover_Letter"]) +
        ".pdf";
    }
  } catch (err) {
    logger.error("resume pdf export validation failed", {
      userId: auth.id,
      kind: body.kind,
      error: toError(err),
    });
    return NextResponse.json(
      {
        error: {
          code: "FACT_VALIDATION_FAILED",
          message: "The edited content failed export validation.",
          fields: {},
        },
      },
      { status: 422 },
    );
  }

  try {
    const job = await getRenderJobStore().create({
      jobId: crypto.randomUUID(),
      createdBy: auth.id,
      generationId: body.generationId,
      kind,
      payload,
      filename,
    });

    const queue = getRenderJobQueue();
    if (queue) {
      await queue.enqueue({ jobId: job.jobId });
    } else {
      void processRenderJob(job.jobId).catch((error: unknown) => {
        logger.error("inline render-job processing failed", {
          jobId: job.jobId,
          error: toError(error),
        });
      });
    }

    return NextResponse.json({ jobId: job.jobId, filename }, { status: 202 });
  } catch (error) {
    logRouteError("resume pdf export enqueue failed", error, { userId: auth.id });
    return NextResponse.json(
      {
        error: {
          code: "PERSISTENCE_FAILED",
          message: "The export job could not be started. Try again shortly.",
          fields: {},
        },
      },
      { status: 500 },
    );
  }
}
