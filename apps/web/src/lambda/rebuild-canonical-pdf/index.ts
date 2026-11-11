import { createLogger } from "@portfolio/observability";
import { getContentRepository } from "@portfolio/data";
import { getMediaStore } from "@portfolio/data/media";
import { getResumeData, projectCanonicalResume } from "@portfolio/shared/resume-data";
import { classicGuidelines, pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { renderResumePdfBuffer } from "@portfolio/ui/resume-pdf";
import {
  CANONICAL_RESUME_CACHED_AT_METADATA_KEY,
  CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY,
  CANONICAL_RESUME_PDF_KEY,
  CANONICAL_RESUME_PDF_REBUILD_INTERVAL_SECONDS,
  hashCanonicalResumeContent,
  isCanonicalResumeCacheFresh,
  resolveWebsiteHost,
} from "../../lib/resume-pdf-cache";

const logger = createLogger({ serviceName: "portfolio-web-rebuild-canonical-pdf" });

// This Lambda is off any request path (EventBridge schedule, WebStack), so it
// can afford a generous deadline with no CloudFront/Lambda-timeout ceiling to
// worry about. It's pure insurance to keep the cache warm — `/api/pdf` itself
// never depends on this having run (it write-throughs on every cache miss).
const RENDER_DEADLINE_MS = 90_000;

/**
 * Runs on admin `ContentChanged` (immediate rebuild) and on a daily backstop
 * sweep. Re-renders the canonical resume PDF only when the content hash
 * changed or the cached copy would go stale before the next sweep.
 */
export async function handler(): Promise<void> {
  const repo = getContentRepository();
  const [raw, layouts] = await Promise.all([
    getResumeData(repo, { websiteHost: resolveWebsiteHost(), forPublicSite: true }),
    repo.getResumeLayouts().catch(() => []),
  ]);
  const layout = pickDefaultResumeLayout(layouts);
  const data = projectCanonicalResume(raw, layout?.guidelines ?? classicGuidelines());
  const contentHash = hashCanonicalResumeContent(data, layout);

  const mediaStore = await getMediaStore();
  const cached = await mediaStore
    .getObject(CANONICAL_RESUME_PDF_KEY)
    .catch((error: unknown) => {
      logger.warn("canonical resume pdf cache read failed during rebuild sweep", {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return null;
    });
  // Renew when the copy would expire before the next sweep, so /api/pdf never
  // has to render on a visitor's request just because the TTL lapsed.
  const nextSweepAt = Date.now() + CANONICAL_RESUME_PDF_REBUILD_INTERVAL_SECONDS * 1000;
  if (
    cached?.metadata?.[CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY] === contentHash &&
    isCanonicalResumeCacheFresh(cached.metadata, nextSweepAt)
  ) {
    logger.info("canonical resume pdf cache already warm, skipping rebuild", {
      contentHash,
    });
    return;
  }

  const { buffer, fitReport } = await renderResumePdfBuffer(data, layout, {
    mode: "canonical",
    fit: "guidelines-only",
    deadlineAt: Date.now() + RENDER_DEADLINE_MS,
  });

  await mediaStore.uploadObject(
    new Uint8Array(buffer),
    CANONICAL_RESUME_PDF_KEY,
    "application/pdf",
    {
      [CANONICAL_RESUME_CONTENT_HASH_METADATA_KEY]: contentHash,
      [CANONICAL_RESUME_CACHED_AT_METADATA_KEY]: new Date().toISOString(),
    },
  );

  if (fitReport?.degraded) {
    logger.error("canonical resume pdf rebuilt degraded (did not fit one page)", {
      contentHash,
      fitReport,
    });
  } else {
    logger.info("canonical resume pdf cache rebuilt", { contentHash, fitReport });
  }
}
