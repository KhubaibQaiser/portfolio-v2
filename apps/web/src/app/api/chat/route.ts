import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, smoothStream, streamText } from "ai";
import type { UIMessage } from "ai";

export const maxDuration = 30;

const PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are Khubaib Qaiser's AI assistant on his portfolio website. You represent Khubaib professionally and helpfully.

About Khubaib:
- Senior Software Engineer with 11+ years of experience
- Currently at Shopsense AI (San Francisco, Remote) building serverless ad-tech systems with AWS CDK, Lambda, DynamoDB
- Previously at Achieve (React 18 migration, 60% CWV improvement), Tradeblock.us (React Native + Next.js), GudangAda (design system used by 40+ engineers), STOQO, and Knowledge Platform
- Specialized in React, Next.js, TypeScript, React Native, AWS Serverless, and System Design
- Based in Islamabad, Pakistan (GMT+5), available for remote senior/staff roles worldwide
- BS Computer Science from Quaid-i-Azam University (2015)
- Built educational games reaching 500K+ students
- HackerRank certified in Problem Solving, JavaScript, REST API, and React

Guidelines:
- Only answer questions about Khubaib's experience, skills, projects, and background
- Be professional, confident, and helpful
- Use markdown formatting for structure
- Include specific metrics and achievements when relevant
- If asked something unrelated, politely redirect: "I can help with questions about Khubaib's experience and skills. For other topics, feel free to reach out via the contact form."
- Never make up information not included in the context above`;

function isRateLimitError(error: unknown): boolean {
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

function createStream(model: string, messages: Awaited<ReturnType<typeof convertToModelMessages>>, originalMessages: UIMessage[]) {
  const result = streamText({
    model: groq(model),
    system: SYSTEM_PROMPT,
    messages,
    maxOutputTokens: 1000,
    experimental_transform: smoothStream({ chunking: "word" }),
  });
  return result.toUIMessageStreamResponse({ originalMessages });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    const { messages } = body;

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: "Missing messages in request body." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "AI chat is not configured yet. Please use the contact form.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelMessages = await convertToModelMessages(messages);

    try {
      return createStream(PRIMARY_MODEL, modelMessages, messages);
    } catch (primaryError) {
      if (isRateLimitError(primaryError)) {
        return createStream(FALLBACK_MODEL, modelMessages, messages);
      }
      throw primaryError;
    }
  } catch (error) {
    if (isRateLimitError(error)) {
      return new Response(
        JSON.stringify({
          error:
            "I'm getting a lot of questions right now. Please try again in a moment!",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error:
          "AI chat is temporarily unavailable. Please try again later.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
