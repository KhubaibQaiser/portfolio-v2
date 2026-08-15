import { renderResumePdfBuffer } from "@portfolio/ui/resume-pdf";
import { pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { getContentRepository } from "@portfolio/data";
import { getResumeData } from "@/lib/resume-data";
import { logger } from "@/lib/logger";
import { checkResumePdfRateLimit } from "@/lib/resume-pdf-rate-limit";
import { toError } from "@/lib/to-error";

export const dynamic = "force-dynamic";

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
    const [data, layouts] = await Promise.all([
      getResumeData(),
      repo.getResumeLayouts().catch(() => []),
    ]);
    const layout = pickDefaultResumeLayout(layouts);
    const { buffer, fitReport } = await renderResumePdfBuffer(data, layout, {
      mode: "canonical",
    });
    const bytes = new Uint8Array(buffer);

    const slug = (value: string) =>
      value
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
    const filename = `${slug(data.name)}-${slug(data.title)}-Resume.pdf`;

    logger.info("resume pdf generated", {
      bytes: bytes.byteLength,
      fitReport,
    });

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=10, s-maxage=10, stale-while-revalidate=86400",
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
