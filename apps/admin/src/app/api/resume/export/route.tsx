import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CoverLetterDocument,
  renderResumePdfBuffer,
  type CoverLetterMeta,
} from "@portfolio/ui/resume-pdf";
import { tailoredResumeSchema, coverLetterSchema } from "@portfolio/ai/schemas";
import { sanitizeLlmObject } from "@portfolio/ai/guardrails/output-sanitize";
import { applyTailoredResume, getResumeData } from "@portfolio/shared/resume-data";
import { pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("resume"),
    resume: tailoredResumeSchema,
    layoutId: z.string().min(1).optional(),
  }),
  z.object({
    kind: z.literal("cover_letter"),
    coverLetter: coverLetterSchema,
    meta: z
      .object({
        company: z.string().max(200).optional(),
        role: z.string().max(200).optional(),
      })
      .optional(),
  }),
]);

function safeFileName(parts: (string | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p && p.trim().length > 0))
    .map((p) => p.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("-");
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const repo = getContentRepository();
  const base = await getResumeData(repo);

  logger.info("resume pdf export requested", {
    userId: auth.id,
    kind: body.kind,
  });

  try {
    if (body.kind === "resume") {
      const tailored = sanitizeLlmObject(body.resume);
      const layouts = await repo.getResumeLayouts().catch(() => []);
      const layout = body.layoutId
        ? (layouts.find((item) => item.id === body.layoutId) ??
          pickDefaultResumeLayout(layouts))
        : pickDefaultResumeLayout(layouts);
      const data = applyTailoredResume(
        base,
        tailored,
        layout
          ? {
              maxRoles: layout.guidelines.validation.maxExperienceItems,
              maxBullets: Math.min(
                layout.guidelines.validation.maxBulletsPerRole,
                layout.guidelines.formatting.layout.maxBulletsPerJob,
              ),
            }
          : undefined,
      );
      const { buffer, fitReport } = await renderResumePdfBuffer(data, layout);
      const filename = safeFileName([base.name, base.title, "Resume"]) + ".pdf";
      logger.info("resume pdf export fitted", {
        userId: auth.id,
        layoutId: layout?.id ?? null,
        fitReport,
      });
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
          ...(fitReport ? { "X-Resume-Fit-Report": JSON.stringify(fitReport) } : {}),
        },
      });
    }

    const letter = sanitizeLlmObject(body.coverLetter);
    const meta: CoverLetterMeta = {
      company: body.meta?.company,
      role: body.meta?.role,
    };
    const buffer = await renderToBuffer(
      <CoverLetterDocument contact={base} letter={letter} meta={meta} />,
    );
    const filename =
      safeFileName([base.name, body.meta?.company, body.meta?.role, "Cover_Letter"]) +
      ".pdf";
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("resume pdf export failed", {
      userId: auth.id,
      kind: body.kind,
      error: err instanceof Error ? err : new Error(String(err)),
    });
    const message = err instanceof Error ? err.message : "Failed to render PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
