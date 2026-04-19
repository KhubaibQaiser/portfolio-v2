import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { SlugViewTracker } from "@/components/analytics/slug-view-tracker";
import { notFound } from "next/navigation";

type BlogPostData = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  published_at: string;
  reading_time_minutes: number;
};

const POSTS: Record<string, BlogPostData> = {
  "building-serverless-ad-platform-aws-cdk": {
    slug: "building-serverless-ad-platform-aws-cdk",
    title: "Building a Serverless Ad Platform with AWS CDK",
    excerpt:
      "How I architected a serverless ad delivery system handling 50K+ daily impressions with sub-100ms latency.",
    content: `This article walks through the architecture of a serverless ad delivery platform I built at Shopsense AI. The system handles 50,000+ daily impressions with sub-100ms p99 latency.

## Architecture Overview

The platform uses a fully serverless architecture on AWS, orchestrated with CDK for infrastructure-as-code.

**Key components:**
- AWS Lambda for ad selection and serving logic
- DynamoDB for campaign and impression storage
- SQS for async event processing
- CloudFront for edge caching and low-latency delivery

## Why Serverless?

For an ad platform with bursty traffic patterns, serverless is ideal. We pay only for what we use, scale automatically, and eliminate server management overhead.

## Results

- 50K+ daily impressions served
- Sub-100ms p99 latency
- 20%+ improvement in engagement metrics
- Zero operational overhead

*More content coming soon — this is a placeholder for the full article.*`,
    tags: ["AWS", "CDK", "Serverless", "DynamoDB"],
    published_at: "2026-03-15",
    reading_time_minutes: 12,
  },
  "migrating-cra-to-vite-at-scale": {
    slug: "migrating-cra-to-vite-at-scale",
    title: "Migrating CRA to Vite at Scale: Lessons from 3 Micro-frontends",
    excerpt:
      "A deep dive into the strategy, gotchas, and results of migrating multiple CRA projects to Vite.",
    content: `When Achieve decided to migrate our React apps from Create React App to Vite, we knew it wouldn't be a simple find-and-replace. Here's what we learned migrating 3 micro-frontends.

## The Problem

CRA was showing its age — build times exceeding 2 minutes, slow HMR, and no easy path to modern features like ESM or top-level await.

## Migration Strategy

1. Audit dependencies for CJS/ESM compatibility
2. Create Vite config with CRA-equivalent plugins
3. Migrate one app at a time, starting with the simplest
4. Run both build systems in parallel during transition

## Key Gotchas

- Some Jest-specific imports needed updating for Vitest
- CSS Modules naming convention differences
- Environment variable prefix change (REACT_APP_ → VITE_)

## Results

- 70% reduction in build times
- Near-instant HMR
- Significant improvement in developer satisfaction

*Full article with code examples coming soon.*`,
    tags: ["Vite", "React", "Performance", "DX"],
    published_at: "2026-02-20",
    reading_time_minutes: 9,
  },
  "design-system-npm-package-guide": {
    slug: "design-system-npm-package-guide",
    title: "Building a Private npm Design System Used by 40+ Engineers",
    excerpt: "Everything I learned building a shared design system at GudangAda.",
    content: `At GudangAda, I built a private npm design system from the ground up that was adopted by 40+ engineers across 8 teams. Here's the full story.

## Why Build One?

With 8 product teams, UI inconsistency was rampant. Each team had its own button styles, form patterns, and color palettes.

## Architecture Decisions

- **Monorepo with Lerna** for package management
- **Storybook** for documentation and visual testing
- **Tailwind CSS** as the styling foundation
- **Semantic versioning** with automated changelogs

## Component API Design

The key to adoption was making the API intuitive. Every component follows these principles:
1. Sensible defaults — works out of the box
2. Composable — combine primitives for complex UIs
3. Accessible — WCAG 2.1 AA by default
4. Themeable — supports brand customization

## Rollout Strategy

We rolled out gradually: core team → early adopters → company-wide mandate.

*Full article with component examples coming soon.*`,
    tags: ["Design System", "npm", "React", "Storybook"],
    published_at: "2026-01-10",
    reading_time_minutes: 15,
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: "Khubaib Qaiser" }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  return (
    <div className="py-32">
      <SlugViewTracker kind="blog" slug={slug} />
      <article className="mx-auto max-w-3xl px-(--container-padding)">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-accent inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <header className="mt-8">
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="bg-border h-1 w-1 rounded-full" />
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.reading_time_minutes} min read
            </span>
          </div>

          <h1 className="mt-4 text-[length:var(--text-h1)] font-bold tracking-tight">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="border-accent/30 bg-accent/5 text-accent rounded-full border px-3 py-1 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="prose prose-neutral dark:prose-invert mt-12 max-w-none">
          {post.content.split("\n\n").map((para, i) => {
            if (para.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="mt-10 mb-4 text-[length:var(--text-h3)] font-bold tracking-tight"
                >
                  {para.replace("## ", "")}
                </h2>
              );
            }
            if (para.startsWith("**")) {
              return (
                <p key={i} className="text-foreground leading-relaxed font-semibold">
                  {para}
                </p>
              );
            }
            if (para.startsWith("- ") || para.startsWith("1. ")) {
              const items = para.split("\n");
              return (
                <ul key={i} className="space-y-1">
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground flex gap-2">
                      <span className="bg-accent mt-2 h-1 w-1 flex-shrink-0 rounded-full" />
                      {item.replace(/^[-\d.]\s*/, "")}
                    </li>
                  ))}
                </ul>
              );
            }
            if (para.startsWith("*") && para.endsWith("*")) {
              return (
                <p key={i} className="text-muted-foreground/80 italic">
                  {para.replace(/^\*|\*$/g, "")}
                </p>
              );
            }
            return (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {para}
              </p>
            );
          })}
        </div>
      </article>
    </div>
  );
}
