import { randomUUID } from "node:crypto";

const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Sanitizes an uploaded filename into a safe, URL-friendly base name. */
export function safeObjectFilename(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "file";
}

/** Builds a unique `media/<uuid>-<name>` object key for a new upload. */
export function buildObjectKey(originalFilename: string): string {
  return `media/${randomUUID()}-${safeObjectFilename(originalFilename)}`;
}

/** Whether the given MIME type is an accepted image type. */
export function isAllowedImageMime(type: string): boolean {
  return ALLOWED_UPLOAD_TYPES.has(type);
}
