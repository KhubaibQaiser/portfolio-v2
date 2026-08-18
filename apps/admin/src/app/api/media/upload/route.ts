import { NextResponse } from "next/server";
import { getContentRepository } from "@portfolio/data";
import { getMediaStore } from "@portfolio/data/media";
import { altTextFromFilename } from "@portfolio/shared/alt-text";
import { mediaInsertSchema } from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const mediaStore = await getMediaStore();
  if (!mediaStore.isConfigured()) {
    return NextResponse.json(
      { error: "Media storage is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Expected file field "file"' }, { status: 400 });
  }

  if (!mediaStore.isAllowedImageMime(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, and WebP images are allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const objectKey = mediaStore.buildObjectKey(file.name);

  try {
    await mediaStore.uploadObject(bytes, objectKey, file.type);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload to storage failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const publicUrl = mediaStore.buildPublicObjectUrl(objectKey);
  const rawAlt = formData.get("alt");
  const altText =
    typeof rawAlt === "string" && rawAlt.trim()
      ? rawAlt.trim().slice(0, 500)
      : altTextFromFilename(file.name);

  const parsed = mediaInsertSchema.safeParse({
    filename: file.name,
    url: publicUrl,
    mime_type: file.type,
    size: bytes.length,
    alt_text: altText,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const row = await getContentRepository().insertMedia(parsed.data);
    return NextResponse.json({ media: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save media record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
