import type { LanguageModel } from "ai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import type { UIMessage } from "ai";
import { unstable_cache as cache } from "next/cache";
import {
  MODEL_IDS,
  ensureGroqApiKey,
  isProviderRateLimitError,
  modelFor,
} from "@portfolio/ai";
import { stripPromptInjection } from "@portfolio/ai/guardrails/prompt-injection";
import { captureServerEvent } from "@/lib/analytics/capture-server";
import { PortfolioEvents } from "@/lib/analytics/events";
import { getDistinctIdFromRequest } from "@/lib/analytics/request";
import type { ChatApiErrorBody } from "@/lib/chat-api-error";
import { checkChatRateLimit } from "@/lib/chat-rate-limit";
import {
  buildChatResponseCacheKey,
  chatResponseCacheTtlSec,
  extractUserText,
  isChatResponseCacheEnabled,
  isFirstTurnChat,
  normalizeChatPrompt,
  shouldStoreChatResponse,
} from "@/lib/chat-response-cache";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";
import { getChatResponseCache, getContentRepository } from "@portfolio/data";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";
import { groq } from "@ai-sdk/groq";

export const maxDuration = 30;

const RATE_LIMIT_USER_MESSAGE =
  "Too many messages. Please wait a moment before sending another.";
const RATE_LIMIT_PROVIDER_MESSAGE =
  "I'm getting a lot of questions right now. Please try again in a moment!";

function jsonResponse(body: ChatApiErrorBody, status: number) {
  const retry =
    typeof body.retryAfterSeconds === "number"
      ? Math.max(1, Math.ceil(body.retryAfterSeconds))
      : undefined;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(retry !== undefined ? { "Retry-After": String(retry) } : {}),
    },
  });
}

const buildSystemPrompt = cache(
  async () => {
    const repo = getContentRepository();
    const [hero, about, experience, projects, skills, config] = await Promise.all([
      repo.getHero(),
      repo.getAbout(),
      repo.getExperience(),
      repo.getProjects(),
      repo.getSkills(),
      repo.getSiteConfig(),
    ]);

    const companiesFromExperience = uniqueCompanyCount(experience);

    const expSummary = experience
      .map(
        (e) =>
          `- ${e.role} at ${e.company} (${e.start_date} – ${e.end_date ?? "Present"}, ${e.location}, ${e.location_type}): ${e.description.split("\n").join("; ")} [${e.tech_tags.join(", ")}]`,
      )
      .join("\n");

    const projectsSummary = projects
      .map(
        (p) =>
          `- ${p.title} (${p.type}, ${p.role}): ${p.summary} [${p.tech_tags.join(", ")}]`,
      )
      .join("\n");

    const grouped = skills.reduce<Record<string, string[]>>((acc, s) => {
      const cat = s.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat]!.push(s.name);
      return acc;
    }, {});
    const skillsSummary = Object.entries(grouped)
      .map(([cat, items]) => `- ${cat}: ${items.join(", ")}`)
      .join("\n");

    return `You are ${config.name}. You are chatting directly with a visitor on your portfolio website. Always reply in first person ("I", "my") as yourself — never third person about yourself, and never as an AI assistant speaking about ${config.name}.

About me:
- ${config.title}
- ${hero.headline}
- ${about.bio.split("\n").filter(Boolean).join(" ")}
- ${about.years_experience}+ years of experience across ${companiesFromExperience} companies in ${about.countries_count} countries
- ${about.users_impacted} users impacted
- Industries: ${about.industries.join(", ")}
- Based in ${config.location} (${about.timezone}), status: ${about.status}
- Languages: ${about.languages.join(", ")}

My experience:
${expSummary}

My projects:
${projectsSummary}

My skills:
${skillsSummary}

Guidelines:
- Only answer questions about my experience, skills, projects, and background
- Be professional, confident, and helpful
- Use markdown formatting for structure
- Include specific metrics and achievements when relevant
- Every reply must stay in first person — including when you cannot answer or redirect
- If asked something unrelated or not covered above, reply in first person: "I can chat about my experience, projects, and skills — for anything else, the contact form is best."
- Never make up information not included in the context above`;
  },
  ["chat-system-prompt"],
  { revalidate: 10 },
);

function cachedAssistantResponse(
  cachedText: string,
  originalMessages: UIMessage[],
): Response {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      const id = "cached-text";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: cachedText });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function createStream(
  systemPrompt: string,
  model: LanguageModel,
  modelId: string,
  messages: Awaited<ReturnType<typeof convertToModelMessages>>,
  originalMessages: UIMessage[],
  cacheWrite?: { key: string },
) {
  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    maxOutputTokens: 1000,
    experimental_transform: smoothStream({ chunking: "word" }),
    onError: ({ error }) => {
      logger.error("chat stream failed", {
        modelId,
        error: toError(error),
      });
    },
    onFinish: async ({ text, finishReason }) => {
      if (!cacheWrite) return;
      if (finishReason !== "stop" && finishReason !== "length") return;
      if (!shouldStoreChatResponse(text)) return;

      try {
        await getChatResponseCache().set(cacheWrite.key, text, chatResponseCacheTtlSec());
      } catch (error) {
        // Fail-open: a cache write miss must never break the user response.
        logger.warn("chat response cache write failed", {
          error: toError(error),
          modelId,
        });
      }
    },
  });
  return result.toUIMessageStreamResponse({ originalMessages });
}

function sanitizeUserMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => {
    if (m.role !== "user" || !m.parts) return m;
    return {
      ...m,
      parts: m.parts.map((p) =>
        p.type === "text" ? { ...p, text: stripPromptInjection(p.text) } : p,
      ),
    };
  });
}

export async function POST(req: Request) {
  const distinctId = getDistinctIdFromRequest(req);

  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    const { messages } = body;

    if (!messages?.length) {
      logger.warn("chat api rejected: missing messages");
      await captureServerEvent(distinctId, PortfolioEvents.chatApiError, {
        reason: "missing_messages",
        status: 400,
      });
      return jsonResponse({ error: "Missing messages in request body." }, 400);
    }

    const rate = await checkChatRateLimit(req);
    if (!rate.ok) {
      logger.warn("chat api rate limited", {
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      await captureServerEvent(distinctId, PortfolioEvents.chatApiError, {
        reason: "rate_limited",
        status: 429,
      });
      return jsonResponse(
        {
          error: RATE_LIMIT_USER_MESSAGE,
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        429,
      );
    }

    const systemPrompt = await buildSystemPrompt();
    const sanitizedMessages = sanitizeUserMessages(messages);
    const primary = modelFor("fast");

    let cacheKey: string | undefined;
    const cacheable = isChatResponseCacheEnabled() && isFirstTurnChat(sanitizedMessages);

    if (cacheable) {
      const lastUser = [...sanitizedMessages].reverse().find((m) => m.role === "user");
      const promptText = lastUser ? extractUserText(lastUser) : "";
      const normalized = normalizeChatPrompt(promptText);

      if (normalized.length > 0) {
        cacheKey = buildChatResponseCacheKey({
          normalizedPrompt: normalized,
          modelId: primary.modelId,
          systemPrompt,
        });

        try {
          const hit = await getChatResponseCache().get(cacheKey);
          if (hit) {
            await captureServerEvent(distinctId, PortfolioEvents.chatApiRequest, {
              message_count: messages.length,
              cache_hit: true,
              model_id: primary.modelId,
            });
            return cachedAssistantResponse(hit.text, messages);
          }
        } catch (error) {
          logger.warn("chat response cache read failed", {
            error: toError(error),
          });
        }
      }
    }

    try {
      await ensureGroqApiKey();
    } catch (error) {
      logger.error("failed to load Groq API key from Secrets Manager", {
        error: toError(error),
      });
      await captureServerEvent(distinctId, PortfolioEvents.chatApiError, {
        reason: "missing_groq_key",
        status: 503,
      });
      return jsonResponse(
        {
          error: "AI chat is not configured yet. Please use the contact form.",
        },
        503,
      );
    }

    const modelMessages = await convertToModelMessages(sanitizedMessages);

    await captureServerEvent(distinctId, PortfolioEvents.chatApiRequest, {
      message_count: messages.length,
      cache_hit: false,
      model_id: primary.modelId,
    });

    const fallback = groq(MODEL_IDS.groqGptOss20b);
    const cacheWrite = cacheKey ? { key: cacheKey } : undefined;

    try {
      return createStream(
        systemPrompt,
        primary.model,
        primary.modelId,
        modelMessages,
        messages,
        cacheWrite,
      );
    } catch (primaryError) {
      if (isProviderRateLimitError(primaryError)) {
        logger.warn("chat primary model rate limited, using fallback", {
          primaryModelId: primary.modelId,
          fallbackModelId: MODEL_IDS.groqGptOss20b,
        });
        return createStream(
          systemPrompt,
          fallback,
          MODEL_IDS.groqGptOss20b,
          modelMessages,
          messages,
          // Key is primary-model scoped; do not write under a different model.
          undefined,
        );
      }
      throw primaryError;
    }
  } catch (error) {
    if (isProviderRateLimitError(error)) {
      logger.warn("chat provider rate limited after fallback exhausted");
      await captureServerEvent(distinctId, PortfolioEvents.chatApiError, {
        reason: "provider_rate_limited",
        status: 429,
      });
      return jsonResponse(
        {
          error: RATE_LIMIT_PROVIDER_MESSAGE,
          retryAfterSeconds: 60,
        },
        429,
      );
    }

    logger.error("chat api failed", {
      error: toError(error),
      distinctId,
    });
    await captureServerEvent(distinctId, PortfolioEvents.chatApiError, {
      reason: "unhandled",
      status: 500,
    });
    return jsonResponse(
      {
        error: "AI chat is temporarily unavailable. Please try again later.",
      },
      500,
    );
  }
}
