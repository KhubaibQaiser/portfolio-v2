import { describe, expect, it } from "vitest";
import { collectNormalizedJobs } from "./collect";
import type { FeedFetch } from "./types";

const now = new Date("2026-08-10T12:00:00.000Z");

function jsonResponse(body: unknown, status = 200): { status: number; text: string } {
  return { status, text: JSON.stringify(body) };
}

describe("collectNormalizedJobs", () => {
  it("walks free boards and skips JobsPipe when already ran today", async () => {
    const urls: string[] = [];
    const fetchImpl: FeedFetch = async (url) => {
      urls.push(url);
      if (url.includes("remotive")) {
        return jsonResponse({
          jobs: [
            {
              id: 1,
              title: "Staff Software Engineer",
              company_name: "Acme",
              url: "https://example.com/jobs/1",
              publication_date: "2026-08-08T00:00:00.000Z",
              description: "TypeScript",
            },
          ],
        });
      }
      if (url.includes("remoteok")) {
        return jsonResponse([
          { legal: "notice" },
          {
            id: "2",
            position: "Senior Software Engineer",
            company: "Beta",
            apply_url: "https://example.com/2",
            date: "2026-08-09T00:00:00.000Z",
          },
        ]);
      }
      if (url.includes("arbeitnow")) {
        return jsonResponse({ data: [] });
      }
      if (url.includes("themuse")) {
        return jsonResponse({ results: [], page_count: 0 });
      }
      if (url.includes("weworkremotely")) {
        return {
          status: 200,
          text: `<rss><channel></channel></rss>`,
        };
      }
      if (url.includes("jobspipe")) {
        throw new Error("JobsPipe should not run");
      }
      return { status: 404, text: "" };
    };

    const result = await collectNormalizedJobs({
      recencyDays: 7,
      titleFamilies: ["staff software engineer"],
      remotePreferred: true,
      jobspipeKey: "jp_live_test",
      jobspipeAlreadyRanToday: true,
      fetchImpl,
      now,
    });

    expect(result.jobspipeRan).toBe(false);
    expect(result.jobs).toHaveLength(2);
    expect(urls.some((url) => url.includes("jobspipe"))).toBe(false);
  });

  it("calls JobsPipe once when a live key is present and the day is unused", async () => {
    const fetchImpl: FeedFetch = async (url) => {
      if (url.includes("jobspipe")) {
        return jsonResponse({
          data: [
            {
              id: "jp-1",
              job_title: "Staff Software Engineer",
              company: "Gamma",
              remote: true,
              final_url: "https://example.com/jp-1",
              date_posted: "2026-08-09",
              description: "TypeScript AWS",
            },
          ],
        });
      }
      if (url.includes("remotive")) return jsonResponse({ jobs: [] });
      if (url.includes("remoteok")) return jsonResponse([]);
      if (url.includes("arbeitnow")) return jsonResponse({ data: [] });
      if (url.includes("themuse")) return jsonResponse({ results: [], page_count: 0 });
      if (url.includes("weworkremotely")) return { status: 200, text: "<rss></rss>" };
      return { status: 404, text: "" };
    };

    const result = await collectNormalizedJobs({
      recencyDays: 7,
      titleFamilies: ["staff software engineer"],
      remotePreferred: true,
      jobspipeKey: "jp_live_test",
      jobspipeAlreadyRanToday: false,
      fetchImpl,
      now,
    });

    expect(result.jobspipeRan).toBe(true);
    expect(result.jobs.some((job) => job.source === "jobspipe")).toBe(true);
  });

  it("does not call JobsPipe for a placeholder key", async () => {
    const urls: string[] = [];
    const fetchImpl: FeedFetch = async (url) => {
      urls.push(url);
      if (url.includes("remotive")) return jsonResponse({ jobs: [] });
      if (url.includes("remoteok")) return jsonResponse([]);
      if (url.includes("arbeitnow")) return jsonResponse({ data: [] });
      if (url.includes("themuse")) return jsonResponse({ results: [], page_count: 0 });
      if (url.includes("weworkremotely")) return { status: 200, text: "<rss></rss>" };
      return { status: 404, text: "" };
    };

    const result = await collectNormalizedJobs({
      recencyDays: 7,
      titleFamilies: [],
      remotePreferred: true,
      jobspipeKey: "placeholder-not-a-live-key",
      jobspipeAlreadyRanToday: false,
      fetchImpl,
      now,
    });

    expect(result.jobspipeRan).toBe(false);
    expect(urls.some((url) => url.includes("jobspipe"))).toBe(false);
  });
});
