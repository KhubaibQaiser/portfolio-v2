import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ResumeDocument,
  CoverLetterDocument,
  type CoverLetterMeta,
} from "@portfolio/ui/resume-pdf";
import {
  tailoredResumeSchema,
  coverLetterSchema,
  type TailoredResume,
} from "@portfolio/ai/schemas";
import { sanitizeLlmObject } from "@portfolio/ai/guardrails/output-sanitize";
import { getResumeData, type ResumeData } from "@portfolio/shared/resume-data";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("resume"),
    resume: tailoredResumeSchema,
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
    .map((p) => p.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, ""))
    .filter(Boolean)
    .join("_");
}

/**
 * Merge the tailored AI resume into the admin's canonical ResumeData shape
 * used by `ResumeDocument`. We keep name/contact/education/certifications
 * from the DB (authoritative), and overlay summary/experience bullets/skills
 * from the tailored payload.
 */
function applyTailoredResume(base: ResumeData, tailored: TailoredResume): ResumeData {
  const tailoredBulletsByExpId = new Map<string, string[]>();
  for (const e of tailored.experiences) {
    tailoredBulletsByExpId.set(
      e.experienceId,
      e.bullets.map((b) => b.text),
    );
  }

  const experienceByStableIndex = base.experience.map((exp, i) => {
    const stableId = `e${i + 1}`;
    const override = tailoredBulletsByExpId.get(stableId);
    if (!override) return exp;
    return { ...exp, bullets: override };
  });

  const tailoredSkills =
    tailored.skills.length > 0
      ? tailored.skills.map((g) => ({
          category: g.category,
          items: g.items,
        }))
      : base.skills;

  const keywords =
    tailored.keywords.length > 0 ? tailored.keywords.join(", ") : base.keywords;

  return {
    ...base,
    summary: tailored.summary || base.summary,
    experience: experienceByStableIndex,
    skills: tailoredSkills,
    keywords,
  };
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

  const base = await getResumeData(getContentRepository());

  logger.info("resume pdf export requested", {
    userId: auth.id,
    kind: body.kind,
  });

  try {
    if (body.kind === "resume") {
      const tailored = sanitizeLlmObject(body.resume);
      const data = applyTailoredResume(base, tailored);
      const buffer = await renderToBuffer(<ResumeDocument data={data} />);
      const filename = safeFileName([base.name, base.title, "Resume"]) + ".pdf";
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
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
