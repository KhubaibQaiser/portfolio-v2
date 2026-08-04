import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  buildChatResponseCacheKey,
  isFirstTurnChat,
  normalizeChatPrompt,
  shouldStoreChatResponse,
} from "./chat-response-cache";

function userMsg(text: string): UIMessage {
  return {
    id: "u1",
    role: "user",
    parts: [{ type: "text", text }],
  };
}

describe("normalizeChatPrompt", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    expect(normalizeChatPrompt("  What   is  YOUR  Experience?  ")).toBe(
      "what is your experience?",
    );
  });
});

describe("isFirstTurnChat", () => {
  it("is true for a single user message", () => {
    expect(isFirstTurnChat([userMsg("hello")])).toBe(true);
  });

  it("is false when there are multiple user turns", () => {
    expect(
      isFirstTurnChat([
        userMsg("hello"),
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "hi" }],
        },
        userMsg("again"),
      ]),
    ).toBe(false);
  });
});

describe("buildChatResponseCacheKey", () => {
  it("is stable for identical inputs", () => {
    const a = buildChatResponseCacheKey({
      normalizedPrompt: "hello",
      modelId: "openai/gpt-oss-120b",
      systemPrompt: "sys",
    });
    const b = buildChatResponseCacheKey({
      normalizedPrompt: "hello",
      modelId: "openai/gpt-oss-120b",
      systemPrompt: "sys",
    });
    expect(a).toBe(b);
    expect(a.startsWith("CHATCACHE#")).toBe(true);
  });

  it("changes when the system prompt changes", () => {
    const a = buildChatResponseCacheKey({
      normalizedPrompt: "hello",
      modelId: "openai/gpt-oss-120b",
      systemPrompt: "sys-a",
    });
    const b = buildChatResponseCacheKey({
      normalizedPrompt: "hello",
      modelId: "openai/gpt-oss-120b",
      systemPrompt: "sys-b",
    });
    expect(a).not.toBe(b);
  });
});

describe("shouldStoreChatResponse", () => {
  it("rejects empty text", () => {
    expect(shouldStoreChatResponse("   ")).toBe(false);
  });

  it("accepts normal replies", () => {
    expect(shouldStoreChatResponse("I have 11 years of experience.")).toBe(true);
  });
});
