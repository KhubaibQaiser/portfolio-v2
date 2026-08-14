import { renderResumePdfBuffer } from "@portfolio/ui/resume-pdf";
import { pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { getContentRepository } from "@portfolio/data";
import { getResumeData } from "@/lib/resume-data";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = getContentRepository();
  const [data, layouts] = await Promise.all([
    getResumeData(),
    repo.getResumeLayouts().catch(() => []),
  ]);
  const layout = pickDefaultResumeLayout(layouts);
  try {
    const { buffer, fitReport } = await renderResumePdfBuffer(data, layout);
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
