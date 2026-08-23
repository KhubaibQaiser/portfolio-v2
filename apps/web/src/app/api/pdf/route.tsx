import { after } from "next/server";
import { renderResumePdfBuffer } from "@portfolio/ui/resume-pdf";
import { projectCanonicalResume } from "@portfolio/shared/resume-data";
import { classicGuidelines, pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { getContentRepository } from "@portfolio/data";
import { getMediaStore } from "@portfolio/data/media";
import { getResumeData } from "@/lib/resume-data";
import {
  CANONICAL_RESUME_CACHED_AT_METADATA_KEY,
  CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY,
  CANONICAL_RESUME_PDF_CACHE_CONTROL,
  CANONICAL_RESUME_PDF_KEY,
  hashCanonicalResumeContent,
  isCanonicalResumeCacheFresh,
} from "@/lib/resume-pdf-cache";
import { logger } from "@/lib/logger";
import { checkResumePdfRateLimit } from "@/lib/resume-pdf-rate-limit";
import { toError } from "@/lib/to-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Leaves a buffer under maxDuration/the Lambda timeout so a render that
// can't converge on one page still returns a (possibly degraded) PDF well
// before the platform kills the request. See renderResumePdfBuffer's
// deadline/terminal-fallback behavior for why this can never hang or throw.
const RENDER_DEADLINE_MS = 45_000;

function slug(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  try {
    const rateLimit = await checkResumePdfRateLimit(request);
    if (!rateLimit.ok) {
      return Response.json(
        {
          error: "Too many PDF requests. Please try again shortly.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const repo = getContentRepository();
    const [raw, layouts] = await Promise.all([
      getResumeData(),
      repo.getResumeLayouts().catch(() => []),
    ]);
    const layout = pickDefaultResumeLayout(layouts);
    const data = projectCanonicalResume(raw, layout?.guidelines ?? classicGuidelines());
    const filename = `${slug(data.name)}-${slug(data.title)}-Resume.pdf`;
    const contentHash = hashCanonicalResumeContent(data, layout);

    // Cache-first: the overwhelming majority of requests should be a fast S3
    // read with no render in the path at all. A scheduled rebuild Lambda
    // (WebStack) keeps this warm proactively, but this route never depends on
    // it for correctness — every miss/stale read below still falls through to
    // a bounded, total render and repairs the cache itself (write-through).
    const mediaStore = await getMediaStore();
    const cached = await mediaStore.getObject(CANONICAL_RESUME_PDF_KEY).catch((error) => {
      logger.error("canonical resume pdf cache read failed", { error: toError(error) });
      return null;
    });
    if (
      cached?.metadata?.[CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY] === contentHash &&
      isCanonicalResumeCacheFresh(cached.metadata)
    ) {
      return new Response(new Uint8Array(cached.body), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": CANONICAL_RESUME_PDF_CACHE_CONTROL,
        },
      });
    }

    // CMS data + layout guideline caps only — no model calls on this path.
    const { buffer, fitReport } = await renderResumePdfBuffer(data, layout, {
      mode: "canonical",
      fit: "guidelines-only",
      deadlineAt: Date.now() + RENDER_DEADLINE_MS,
    });
    const bytes = new Uint8Array(buffer);

    if (fitReport?.degraded) {
      logger.error("resume pdf rendered degraded (did not fit one page)", { fitReport });
    }

    logger.info("resume pdf generated", {
      bytes: bytes.byteLength,
      fitReport,
      cacheHit: false,
    });

    // Write-through so the next request (and the next rebuild sweep) sees a
    // fresh cache. Scheduled via `after()` so it still runs once the Lambda
    // execution environment would otherwise freeze right after the response
    // is sent; best-effort either way — a failed write must never fail the
    // response that already has valid bytes in hand.
    after(() =>
      mediaStore
        .uploadObject(bytes, CANONICAL_RESUME_PDF_KEY, "application/pdf", {
          [CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY]: contentHash,
          [CANONICAL_RESUME_CACHED_AT_METADATA_KEY]: new Date().toISOString(),
        })
        .catch((error: unknown) => {
          logger.error("canonical resume pdf cache write failed", {
            error: toError(error),
          });
        }),
    );

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": CANONICAL_RESUME_PDF_CACHE_CONTROL,
        ...(fitReport ? { "X-Resume-Fit-Report": JSON.stringify(fitReport) } : {}),
      },
    });
  } catch (error) {
    logger.error("resume pdf generation failed", {
      error: toError(error),
    });
    return Response.json(
      { error: "Failed to generate PDF. Please try again." },
      { status: 500 },
    );
  }
}
