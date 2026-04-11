import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { SITE } from "@portfolio/shared/constants";

export const metadata: Metadata = {
  title: "Blog",
  description: `Technical articles on React, Next.js, TypeScript, AWS, and modern web development by ${SITE.name}.`,
};

const POSTS = [
  {
    slug: "building-serverless-ad-platform-aws-cdk",
    title: "Building a Serverless Ad Platform with AWS CDK",
    excerpt:
      "How I architected a serverless ad delivery system handling 50K+ daily impressions with sub-100ms latency using Lambda, DynamoDB, and CloudFront.",
    tags: ["AWS", "CDK", "Serverless", "DynamoDB"],
    published_at: "2026-03-15",
    reading_time_minutes: 12,
  },
  {
    slug: "migrating-cra-to-vite-at-scale",
    title: "Migrating CRA to Vite at Scale: Lessons from 3 Micro-frontends",
    excerpt:
      "A deep dive into the strategy, gotchas, and results of migrating multiple Create React App projects to Vite in a large organization.",
    tags: ["Vite", "React", "Performance", "DX"],
    published_at: "2026-02-20",
    reading_time_minutes: 9,
  },
  {
    slug: "design-system-npm-package-guide",
    title: "Building a Private npm Design System Used by 40+ Engineers",
    excerpt:
      "From component API design to versioning strategy — everything I learned building a shared design system at GudangAda.",
    tags: ["Design System", "npm", "React", "Storybook"],
    published_at: "2026-01-10",
    reading_time_minutes: 15,
  },
];

export default function BlogPage() {
  return (
    <div className="py-32">
      <div className="mx-auto max-w-3xl px-[var(--container-padding)]">
        <h1 className="text-[length:var(--text-h1)] font-bold tracking-tight">
          Blog
        </h1>
        <p className="mt-4 text-[length:var(--text-body-lg)] text-muted-foreground">
          Technical articles on web development, architecture, and engineering
          leadership.
        </p>

        <div className="mt-12 space-y-8">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-border/50 p-6 transition-all hover:border-accent/30 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.reading_time_minutes} min read
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-tight transition-colors group-hover:text-accent">
                {post.title}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/50 px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
