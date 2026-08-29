import { describe, expect, it } from "vitest";
import { parseRemotivePayload } from "./parse-remotive";
import { parseRemoteOkPayload } from "./parse-remoteok";
import { parseWwrRss } from "./parse-wwr";
import { atsJsonUrl, hydrateJobDescription, isAllowedAtsHost } from "./hydrate";
import { isJobsPipeLiveKey } from "./parse-jobspipe";

describe("job feed parsers", () => {
  it("parses Remotive jobs inside the recency window", () => {
    const now = new Date("2026-08-10T00:00:00.000Z");
    const jobs = parseRemotivePayload(
      {
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
      },
      7,
      now,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.source).toBe("remotive");
  });

  it("skips RemoteOK legal banner objects", () => {
    const now = new Date("2026-08-10T00:00:00.000Z");
    const jobs = parseRemoteOkPayload(
      [
        { legal: "notice" },
        {
          id: "2",
          position: "Senior Software Engineer",
          company: "Beta",
          apply_url: "https://example.com/2",
          date: "2026-08-09T00:00:00.000Z",
        },
      ],
      7,
      now,
    );
    expect(jobs).toHaveLength(1);
  });

  it("parses WWR RSS titles as company : role", () => {
    const now = new Date("2026-08-10T00:00:00.000Z");
    const xml = `
      <rss><channel>
        <item>
          <title>Acme : Staff Software Engineer</title>
          <link>https://weworkremotely.com/jobs/acme-staff</link>
          <pubDate>Sat, 08 Aug 2026 12:00:00 +0000</pubDate>
          <description>Build things</description>
        </item>
      </channel></rss>`;
    const jobs = parseWwrRss(xml, 7, now);
    expect(jobs[0]?.company).toBe("Acme");
    expect(jobs[0]?.title).toBe("Staff Software Engineer");
  });
});

describe("ATS hydrate allowlist", () => {
  it("maps Greenhouse and Lever public URLs to JSON APIs", () => {
    expect(atsJsonUrl("https://boards.greenhouse.io/stripe/jobs/12345")).toBe(
      "https://boards-api.greenhouse.io/v1/boards/stripe/jobs/12345",
    );
    expect(atsJsonUrl("https://jobs.lever.co/acme/abc-def")).toBe(
      "https://api.lever.co/v0/postings/acme/abc-def",
    );
  });

  it("hydrates a short Greenhouse JD from the allowlisted JSON API", async () => {
    const jd = await hydrateJobDescription(
      "https://boards.greenhouse.io/stripe/jobs/12345",
      "short",
      async (url) => {
        expect(url).toBe("https://boards-api.greenhouse.io/v1/boards/stripe/jobs/12345");
        return {
          status: 200,
          text: JSON.stringify({ content: "Full JD from Greenhouse API" }),
        };
      },
    );
    expect(jd).toContain("Full JD");
  });

  it("rejects caller-supplied hosts", () => {
    expect(isAllowedAtsHost("evil.example")).toBe(false);
    expect(atsJsonUrl("https://evil.example/jobs/1")).toBeNull();
  });
});

describe("JobsPipe key gate", () => {
  it("accepts only JobsPipe live keys", () => {
    expect(isJobsPipeLiveKey("jp_live_abc")).toBe(true);
    expect(isJobsPipeLiveKey("placeholder")).toBe(false);
  });
});
