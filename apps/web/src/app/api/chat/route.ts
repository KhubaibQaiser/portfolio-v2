import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, smoothStream, streamText } from "ai";
import type { UIMessage } from "ai";
import { unstable_cache as cache } from "next/cache";
import { captureServerEvent } from "@/lib/analytics/capture-server";
import { PortfolioEvents } from "@/lib/analytics/events";
import { getDistinctIdFromRequest } from "@/lib/analytics/request";
import type { ChatApiErrorBody } from "@/lib/chat-api-error";
import { checkChatRateLimit } from "@/lib/chat-rate-limit";
import { supabase } from "@/lib/supabase-server";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";
import {
  getHero,
  getAbout,
  getExperience,
  getSkills,
  getSiteConfig,
} from "@portfolio/shared/supabase/queries";

export const maxDuration = 30;

const PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

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
    const [hero, about, experience, skills, config] = await Promise.all([
      getHero(supabase),
      getAbout(supabase),
      getExperience(supabase),
      getSkills(supabase),
      getSiteConfig(supabase),
    ]);

    const companiesFromExperience = uniqueCompanyCount(experience);

    const expSummary = experience
      .map(
        (e) =>
          `- ${e.role} at ${e.company} (${e.start_date} – ${e.end_date ?? "Present"}, ${e.location}, ${e.location_type}): ${e.description.split("\n").join("; ")} [${e.tech_tags.join(", ")}]`,
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

    return `You are ${config.name}'s AI assistant on their portfolio website. You represent ${config.name} professionally and helpfully.

About ${config.name}:
- ${config.title}
- ${hero.headline}
- ${about.bio.split("\n").filter(Boolean).join(" ")}
- ${about.years_experience}+ years of experience across ${companiesFromExperience} companies in ${about.countries_count} countries
- ${about.users_impacted} users impacted
- Industries: ${about.industries.join(", ")}
- Based in ${config.location} (${about.timezone}), status: ${about.status}
- Languages: ${about.languages.join(", ")}

Experience:
${expSummary}

Skills:
${skillsSummary}

Guidelines:
- Only answer questions about ${config.name}'s experience, skills, projects, and background
- Be professional, confident, and helpful
- Use markdown formatting for structure
- Include specific metrics and achievements when relevant
- If asked something unrelated, politely redirect: "I can help with questions about ${config.name}'s experience and skills. For other topics, feel free to reach out via the contact form."
- Never make up information not included in the context above`;
  },
  ["chat-system-prompt"],
  { tags: ["hero", "about", "experience", "skills", "site-config"], revalidate: 3600 },
);

function isProviderRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode: number }).statusCode === 429
  ) {
    return true;
  }
  return false;
}

async function createStream(
  systemPrompt: string,
  model: string,
  messages: Awaited<ReturnType<typeof convertToModelMessages>>,
  originalMessages: UIMessage[],
) {
  const result = streamText({
    model: groq(model),
    system: systemPrompt,
    messages,
    maxOutputTokens: 1000,
    experimental_transform: smoothStream({ chunking: "word" }),
  });
  return result.toUIMessageStreamResponse({ originalMessages });
}

export async function POST(req: Request) {
  const distinctId = getDistinctIdFromRequest(req);

  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    const { messages } = body;

    if (!messages?.length) {
      await captureServerEvent(distinctId, PortfolioEvents.chatApiError, {
        reason: "missing_messages",
        status: 400,
      });
      return jsonResponse({ error: "Missing messages in request body." }, 400);
    }

    const rate = await checkChatRateLimit(req);
    if (!rate.ok) {
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

    if (!process.env.GROQ_API_KEY) {
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

    const systemPrompt = await buildSystemPrompt();
    const modelMessages = await convertToModelMessages(messages);

    await captureServerEvent(distinctId, PortfolioEvents.chatApiRequest, {
      message_count: messages.length,
    });

    try {
      return await createStream(systemPrompt, PRIMARY_MODEL, modelMessages, messages);
    } catch (primaryError) {
      if (isProviderRateLimitError(primaryError)) {
        return await createStream(systemPrompt, FALLBACK_MODEL, modelMessages, messages);
      }
      throw primaryError;
    }
  } catch (error) {
    if (isProviderRateLimitError(error)) {
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
