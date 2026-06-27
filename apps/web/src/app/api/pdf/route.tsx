import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@portfolio/ui/resume-pdf";
import { getResumeData } from "@/lib/resume-data";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getResumeData();
  const document = <ResumeDocument data={data} />;

  try {
    const buffer = await renderToBuffer(document);
    const bytes = new Uint8Array(buffer);

    const safeName = data.name.replace(/\s+/g, "_");
    const filename = `${safeName}_${data.title.replace(/\s+/g, "_")}_Resume.pdf`;

    logger.info("resume pdf generated", { bytes: bytes.byteLength });

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
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
