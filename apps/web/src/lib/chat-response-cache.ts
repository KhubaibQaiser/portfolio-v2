import { createHash } from "node:crypto";
import type { UIMessage } from "ai";

/** Bump when the chat system-prompt *template* changes (beyond CMS data). */
export const CHAT_CACHE_SCHEMA_VERSION = "v1";

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
const DEFAULT_MAX_TEXT_CHARS = 12_000;

export function isChatResponseCacheEnabled(): boolean {
  const raw = process.env.CHAT_RESPONSE_CACHE_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}

export function chatResponseCacheTtlSec(): number {
  const raw = process.env.CHAT_RESPONSE_CACHE_TTL_SEC;
  if (raw === undefined || raw === "") return DEFAULT_TTL_SEC;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_SEC;
}

export function chatResponseCacheMaxTextChars(): number {
  const raw = process.env.CHAT_RESPONSE_CACHE_MAX_CHARS;
  if (raw === undefined || raw === "") return DEFAULT_MAX_TEXT_CHARS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_TEXT_CHARS;
}

/** Collapse whitespace and lowercase for exact-match keys. */
export function normalizeChatPrompt(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function extractUserText(message: UIMessage): string {
  if (!message.parts?.length) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

/**
 * First-turn only: exactly one user message in the thread.
 * Avoids serving FAQ cache hits mid-conversation with different context.
 */
export function isFirstTurnChat(messages: UIMessage[]): boolean {
  const userCount = messages.filter((m) => m.role === "user").length;
  return userCount === 1;
}

export function buildChatResponseCacheKey(input: {
  normalizedPrompt: string;
  modelId: string;
  systemPrompt: string;
}): string {
  const systemFingerprint = createHash("sha256")
    .update(input.systemPrompt)
    .digest("hex")
    .slice(0, 16);

  const material = [
    CHAT_CACHE_SCHEMA_VERSION,
    input.modelId,
    systemFingerprint,
    input.normalizedPrompt,
  ].join("|");

  return `CHATCACHE#${createHash("sha256").update(material).digest("hex")}`;
}

export function shouldStoreChatResponse(text: string): boolean {
  if (!text.trim()) return false;
  if (text.length > chatResponseCacheMaxTextChars()) return false;
  return true;
}
