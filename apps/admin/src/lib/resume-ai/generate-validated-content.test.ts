import { beforeEach, describe, expect, it, vi } from "vitest";
import { classicGuidelines } from "@portfolio/shared/schemas";

import { buildCandidateFacts } from "@portfolio/ai/context/build-candidate-facts";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mocks.generateObject,
  NoObjectGeneratedError: {
    isInstance: (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "NoObjectGeneratedError",
  },
}));

vi.mock("@portfolio/ai", () => ({
  modelFor: () => ({
    model: { id: "primary" },
    modelId: "claude-haiku-4-5",
    provider: "anthropic",
  }),
  fallbackChainFor: () => [
    {
      model: { id: "fallback" },
      modelId: "claude-sonnet-4-5",
      provider: "anthropic",
    },
  ],
  formatUsage: (
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
    model: string,
    metadata: { latencyMs: number; fallbackUsed: boolean },
  ) => ({ ...usage, ...metadata, model, costUsd: 0.001 }),
  isRequestTooLargeError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 413,
  isProviderRateLimitError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error.statusCode === 429 || error.statusCode === 413),
}));

import {
  generateValidatedContent,
  ValidatedGenerationError,
} from "./generate-validated-content";

const facts = buildCandidateFacts({
  siteConfig: {
    name: "Test User",
    title: "Senior Engineer",
    email: "test@example.com",
    location: "Remote",
    social_links: [],
  },
  resume: {
    default_summary:
      "Senior engineer building reliable customer products with React and TypeScript.",
    education: [],
    certifications: [],
  },
  experiences: [
    {
      id: "experience-uuid",
      company: "Source Co",
      role: "Senior Engineer",
      location: "Remote",
      location_type: "remote",
      contract_type: "full_time",
      start_date: "Jan 2024",
      end_date: null,
      description: "Built React products.",
      tech_tags: ["React"],
    },
  ],
  skills: [{ category: "frontend", name: "React" }],
});

const validResume = {
  summary:
    "Senior engineer building reliable React products with clear customer and platform impact across production systems.",
  titleOverride: null,
  keywords: ["React"],
  highlightedSkills: ["React"],
  experiences: [
    {
      experienceId: "experience-uuid",
      bullets: [
        {
          experienceId: "experience-uuid",
          sourceBulletIndex: 0,
          text: "Built reliable React products for customers.",
        },
      ],
    },
  ],
  skills: [{ category: "Frontend & UI", items: ["React"] }],
};

const baseOptions = {
  kind: "resume" as const,
  modelMode: "quality" as const,
  wrappedJobDescription: "Senior React engineer role building production products.",
  facts,
  guidelines: classicGuidelines(),
  signal: new AbortController().signal,
  deadlineAt: Number.MAX_SAFE_INTEGER,
};

function generated(object: unknown) {
  return {
    object,
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    finishReason: "stop",
  };
}

describe("generateValidatedContent", () => {
  beforeEach(() => {
    mocks.generateObject.mockReset();
  });

  it("returns only a complete policy-validated resume", async () => {
    mocks.generateObject.mockResolvedValueOnce(generated(validResume));

    const result = await generateValidatedContent(baseOptions);

    expect(result.resume).toEqual(validResume);
    expect(result.attempts).toHaveLength(1);
    expect(result.usage.costUsd).toBe(0.001);
  });

  it("reports AI-tone heuristics without retrying a valid resume", async () => {
    mocks.generateObject.mockResolvedValueOnce(
      generated({
        ...validResume,
        summary:
          "Senior engineer building reliable React products — with clear customer and platform impact.",
      }),
    );

    const result = await generateValidatedContent(baseOptions);

    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(result.warnings).toEqual([
      expect.stringContaining("Wording may read as AI-generated"),
    ]);
  });

  it("retries invalid source references and accepts only the corrected object", async () => {
    mocks.generateObject
      .mockResolvedValueOnce(
        generated({
          ...validResume,
          experiences: [
            {
              ...validResume.experiences[0],
              experienceId: "unknown-id",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(generated(validResume));

    const result = await generateValidatedContent(baseOptions);

    expect(result.resume?.experiences[0]?.experienceId).toBe("experience-uuid");
    expect(result.attempts.map((attempt) => attempt.reason)).toEqual([
      "layout_or_fact_validation",
      "corrective_retry",
    ]);
  });

  it("traverses the provider fallback chain after a transient failure", async () => {
    mocks.generateObject
      .mockRejectedValueOnce({ statusCode: 429 })
      .mockResolvedValueOnce(generated(validResume));

    const result = await generateValidatedContent(baseOptions);

    expect(result.fallbackUsed).toBe(true);
    expect(result.model).toBe("claude-sonnet-4-5");
  });

  it("skips the current model after a Groq 413 TPM rejection", async () => {
    mocks.generateObject
      .mockRejectedValueOnce({
        statusCode: 413,
        message:
          "Request too large for tokens per minute. See https://console.groq.com/settings/billing",
      })
      .mockResolvedValueOnce(generated(validResume));

    const result = await generateValidatedContent(baseOptions);

    expect(mocks.generateObject).toHaveBeenCalledTimes(2);
    expect(result.fallbackUsed).toBe(true);
    expect(result.model).toBe("claude-sonnet-4-5");
    expect(result.attempts[0]).toMatchObject({
      model: "claude-haiku-4-5",
      reason: "provider_unavailable",
    });
  });

  it("never exceeds the shared attempt cap", async () => {
    mocks.generateObject.mockResolvedValue(
      generated({
        ...validResume,
        experiences: [
          {
            ...validResume.experiences[0],
            experienceId: "unknown-id",
          },
        ],
      }),
    );

    await expect(generateValidatedContent(baseOptions)).rejects.toMatchObject({
      code: "FACT_VALIDATION_FAILED",
    });
    expect(mocks.generateObject).toHaveBeenCalledTimes(3);
  });

  it("does not start a provider call without enough deadline budget", async () => {
    await expect(
      generateValidatedContent({ ...baseOptions, deadlineAt: Date.now() + 1 }),
    ).rejects.toMatchObject({
      code: "GENERATION_TIMEOUT",
    });
    expect(mocks.generateObject).not.toHaveBeenCalled();
  });

  it("attaches sanitized provider diagnostics without logging raw error messages", async () => {
    mocks.generateObject.mockRejectedValue({
      name: "AI_APICallError",
      statusCode: 401,
      code: "invalid_api_key",
      message: "Unauthorized request using sk-sensitive-key-fragment",
    });

    const error = await generateValidatedContent(baseOptions).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ValidatedGenerationError);
    expect(error).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      diagnostics: [
        {
          artifact: "resume",
          model: "claude-haiku-4-5",
          provider: "anthropic",
          attempt: 1,
          retry: 0,
          category: "authentication",
          statusCode: 401,
          errorName: "AI_APICallError",
          providerErrorCode: "invalid_api_key",
        },
        {
          artifact: "resume",
          model: "claude-haiku-4-5",
          provider: "anthropic",
          attempt: 2,
          retry: 1,
          category: "authentication",
          statusCode: 401,
          errorName: "AI_APICallError",
          providerErrorCode: "invalid_api_key",
        },
        {
          artifact: "resume",
          model: "claude-sonnet-4-5",
          provider: "anthropic",
          attempt: 3,
          retry: 0,
          category: "authentication",
          statusCode: 401,
          errorName: "AI_APICallError",
          providerErrorCode: "invalid_api_key",
        },
      ],
    });
    expect(JSON.stringify(error)).not.toContain("sk-sensitive-key-fragment");
  });

  it("fails both atomically when the cover letter cannot be validated", async () => {
    const invalidOutput = {
      name: "NoObjectGeneratedError",
      finishReason: "error",
    };
    mocks.generateObject
      .mockResolvedValueOnce(generated(validResume))
      .mockRejectedValue(invalidOutput);

    await expect(
      generateValidatedContent({ ...baseOptions, kind: "both" }),
    ).rejects.toBeInstanceOf(ValidatedGenerationError);
  });

  it("runs resume then cover letter sequentially and splits the shared deadline", async () => {
    const order: string[] = [];
    const validCoverLetter = {
      greeting: "Dear Hiring Manager,",
      body: [
        "I am a senior engineer building reliable React products for customers and teams.",
      ],
      closing: "I would welcome a conversation about this role soon.",
      signOff: "Best regards,\nTest User",
    };
    mocks.generateObject.mockImplementation(
      async (args: { maxOutputTokens?: number }) => {
        if (args.maxOutputTokens === 2500) {
          order.push("resume");
          return generated(validResume);
        }
        order.push("cover");
        return generated(validCoverLetter);
      },
    );

    const result = await generateValidatedContent({
      ...baseOptions,
      kind: "both",
      deadlineAt: Date.now() + 40_000,
    });

    expect(order).toEqual(["resume", "cover"]);
    expect(result.resume).toEqual(validResume);
    expect(result.coverLetter).toEqual(validCoverLetter);
    expect(mocks.generateObject).toHaveBeenCalledTimes(2);
  });

  it("fails fast on validation when remaining budget is below the retry threshold", async () => {
    mocks.generateObject.mockResolvedValue(
      generated({
        ...validResume,
        experiences: [
          {
            ...validResume.experiences[0],
            experienceId: "unknown-id",
          },
        ],
      }),
    );

    await expect(
      generateValidatedContent({
        ...baseOptions,
        deadlineAt: Date.now() + 14_000,
      }),
    ).rejects.toMatchObject({
      code: "FACT_VALIDATION_FAILED",
    });
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
  });

  it("records remainingMsAtFailure on attempt diagnostics", async () => {
    mocks.generateObject.mockRejectedValue({
      name: "AI_APICallError",
      statusCode: 401,
      code: "invalid_api_key",
      message: "Unauthorized",
    });

    const error = await generateValidatedContent(baseOptions).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ValidatedGenerationError);
    expect(
      (error as ValidatedGenerationError).diagnostics.every(
        (diagnostic) => typeof diagnostic.remainingMsAtFailure === "number",
      ),
    ).toBe(true);
  });
});
