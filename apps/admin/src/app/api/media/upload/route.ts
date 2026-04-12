import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertMedia } from "@portfolio/shared/supabase/queries";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { mediaInsertSchema } from "@portfolio/shared/schemas";
import { revalidateWeb } from "@/lib/revalidate-web";
import {
  assertR2Configured,
  buildObjectKey,
  buildPublicObjectUrl,
  isAllowedImageMime,
  uploadObjectToR2,
} from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    assertR2Configured();
  } catch (e) {
    const message = e instanceof Error ? e.message : "R2 not configured";
    return NextResponse.json({ error: message }, { status: 503 });
  }

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
    return NextResponse.json({ error: "Expected file field \"file\"" }, { status: 400 });
  }

  if (!isAllowedImageMime(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectKey = buildObjectKey(file.name);

  try {
    await uploadObjectToR2(buffer, objectKey, file.type);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload to storage failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const publicUrl = buildPublicObjectUrl(objectKey);

  const parsed = mediaInsertSchema.safeParse({
    filename: file.name,
    url: publicUrl,
    mime_type: file.type,
    size: buffer.length,
    alt_text: null,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const row = await insertMedia(supabase, parsed.data);
    await revalidateWeb(["media"]);
    return NextResponse.json({ media: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save media record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
