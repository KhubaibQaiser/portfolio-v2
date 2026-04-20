import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { trimJobDescription } from "@portfolio/ai/context/trim-job-description";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const PARSE_TIMEOUT_MS = 10_000;

function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (bytes[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Expected file field "file"' },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "PDF exceeds 2MB limit" },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!hasPdfMagic(bytes)) {
    return NextResponse.json(
      { error: "File does not appear to be a valid PDF" },
      { status: 400 },
    );
  }

  try {
    const pdf = await withTimeout(
      getDocumentProxy(bytes),
      PARSE_TIMEOUT_MS,
      "PDF parsing",
    );
    const extracted = await withTimeout(
      extractText(pdf, { mergePages: true }),
      PARSE_TIMEOUT_MS,
      "PDF text extraction",
    );

    const raw = Array.isArray(extracted.text)
      ? extracted.text.join("\n")
      : extracted.text;
    const text = trimJobDescription(raw);

    return NextResponse.json({
      text,
      pageCount: extracted.totalPages,
      chars: text.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to extract PDF text";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
