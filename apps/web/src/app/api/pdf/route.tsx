import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/components/resume/pdf-template";
import { getResumeData } from "@/lib/resume-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = getResumeData();
  const document = <ResumeDocument data={data} />;

  try {
    const buffer = await renderToBuffer(document);
    const bytes = new Uint8Array(buffer);

    const filename = `Khubaib_Qaiser_Senior_Software_Engineer_Resume.pdf`;

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
    console.error("PDF generation failed:", error);
    return Response.json(
      { error: "Failed to generate PDF. Please try again." },
      { status: 500 },
    );
  }
}
