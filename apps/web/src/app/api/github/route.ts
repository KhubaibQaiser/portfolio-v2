import { NextResponse } from "next/server";
import { captureServerEvent } from "@/lib/analytics/capture-server";
import { PortfolioEvents } from "@/lib/analytics/events";

const GITHUB_USERNAME = "khubaibqaiser";

type GitHubStats = {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  topLanguages: string[];
  updatedAt: string;
};

export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      await captureServerEvent(undefined, PortfolioEvents.githubApiError, {
        status: res.status,
        reason: "upstream_error",
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch GitHub data" },
        { status: 502 },
      );
    }

    const repos = await res.json();

    const stats: GitHubStats = {
      totalRepos: repos.length,
      totalStars: repos.reduce(
        (sum: number, r: { stargazers_count: number }) =>
          sum + r.stargazers_count,
        0,
      ),
      totalForks: repos.reduce(
        (sum: number, r: { forks_count: number }) => sum + r.forks_count,
        0,
      ),
      topLanguages: [
        ...new Set(
          repos
            .map((r: { language: string | null }) => r.language)
            .filter(Boolean),
        ),
      ].slice(0, 8) as string[],
      updatedAt: new Date().toISOString(),
    };

    await captureServerEvent(undefined, PortfolioEvents.githubApi, {
      repo_count: stats.totalRepos,
      star_total: stats.totalStars,
    });

    return NextResponse.json({ success: true, data: stats });
  } catch {
    await captureServerEvent(undefined, PortfolioEvents.githubApiError, {
      reason: "exception",
    });
    return NextResponse.json(
      { success: false, error: "GitHub API unavailable" },
      { status: 502 },
    );
  }
}
