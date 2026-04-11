import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { GitHubIcon } from "@portfolio/ui/icons";
import { notFound } from "next/navigation";

type ProjectCase = {
  slug: string;
  title: string;
  role: string;
  company: string;
  period: string;
  summary: string;
  problem: string;
  solution: string;
  impact: string[];
  tech: string[];
  github?: string;
  live?: string;
};

const projectCases: Record<string, ProjectCase> = {
  "shopsense-ai-ad-platform": {
    slug: "shopsense-ai-ad-platform",
    title: "Shopsense AI Ad Platform",
    role: "Senior Software Engineer",
    company: "Shopsense AI",
    period: "Aug 2024 – Present",
    summary:
      "Serverless ad delivery system handling 50K+ daily impressions across enterprise clients.",
    problem:
      "Shopsense AI needed a scalable, cost-efficient ad delivery platform capable of handling tens of thousands of daily impressions with real-time analytics and sub-second response times.",
    solution:
      "Architected a fully serverless system using AWS CDK for infrastructure-as-code, Lambda for compute, DynamoDB for low-latency data access, and SQS for event processing. Implemented CloudFront edge caching for ad assets and built a real-time analytics pipeline.",
    impact: [
      "50K+ daily ad impressions served",
      "20%+ engagement improvement through A/B testing pipeline",
      "Sub-100ms ad delivery latency via CloudFront edge",
      "Zero-downtime deployments with CDK-managed infrastructure",
    ],
    tech: ["AWS CDK", "Lambda", "DynamoDB", "SQS", "CloudFront", "React", "TypeScript"],
  },
  "gudangada-design-system": {
    slug: "gudangada-design-system",
    title: "GudangAda Design System",
    role: "Senior Software Engineer",
    company: "GudangAda",
    period: "Sep 2020 – Jan 2023",
    summary:
      "Private npm component library adopted by 40+ engineers across 8 product teams.",
    problem:
      "GudangAda had 8 separate product teams building inconsistent UIs with duplicated components, leading to design drift, bugs, and wasted engineering time.",
    solution:
      "Created a centralized design system as a private npm package with Storybook documentation, automated visual regression testing, and semantic versioning. Established contribution guidelines and component API standards.",
    impact: [
      "Adopted by 40+ engineers across 8 teams",
      "Reduced UI development time by ~40%",
      "Consistent design language across all products",
      "Automated visual regression testing caught 200+ UI bugs before production",
    ],
    tech: ["React", "TypeScript", "Storybook", "styled-components", "npm", "Jest"],
  },
};

export async function generateStaticParams() {
  return Object.keys(projectCases).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projectCases[slug];
  if (!project) return { title: "Project Not Found" };

  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function ProjectCaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projectCases[slug];

  if (!project) {
    notFound();
  }

  return (
    <div className="py-32">
      <div className="mx-auto max-w-3xl px-[var(--container-padding)]">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </Link>

        <h1 className="mt-6 text-[length:var(--text-h1)] font-bold tracking-tight">
          {project.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-accent">{project.company}</span>
          <span>·</span>
          <span>{project.role}</span>
          <span>·</span>
          <span className="font-mono">{project.period}</span>
        </div>

        {/* Links */}
        <div className="mt-4 flex items-center gap-3">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <GitHubIcon className="h-4 w-4" />
              Source
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Live Demo
            </a>
          )}
        </div>

        {/* Cover placeholder */}
        <div className="mt-8 aspect-video rounded-2xl bg-muted" />

        {/* Problem */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-accent">
            The Problem
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {project.problem}
          </p>
        </section>

        {/* Solution */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-accent">
            My Solution
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {project.solution}
          </p>
        </section>

        {/* Impact */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-accent">
            Impact
          </h2>
          <ul className="mt-3 space-y-2">
            {project.impact.map((item, i) => (
              <li
                key={i}
                className="flex gap-2 leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Tech stack */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-accent">
            Tech Stack
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <span
                key={t}
                className="rounded-full bg-accent/10 px-3 py-1 font-mono text-sm text-accent"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
