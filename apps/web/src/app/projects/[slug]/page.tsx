import type { Metadata, ResolvingMetadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { SlugViewTracker } from "@/components/analytics/slug-view-tracker";
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { RelatedProjects } from "@/components/projects/related-projects";
import { GitHubIcon } from "@portfolio/ui/icons";
import { notFound } from "next/navigation";
import { fetchAllProjects, fetchProjectBySlug } from "@/lib/data";
import { breadcrumbListJsonLd, creativeWorkJsonLd } from "@/lib/json-ld";
import { splitPlainTextParagraphs } from "@/lib/plain-text";
import { pickRelatedProjects } from "@/lib/related-projects";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import type { Project } from "@portfolio/shared/schemas";

export const revalidate = 10;

export async function generateStaticParams() {
  const projects = await fetchAllProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);
  if (!project) return { title: "Project Not Found" };

  return buildPageMetadata(parent, {
    title: project.title,
    description: project.summary,
    path: `/projects/${slug}`,
  });
}

function ProjectJsonLd({ project, slug }: { project: Project; slug: string }) {
  const creativeWorkSchema = creativeWorkJsonLd({
    siteUrl: SITE_URL,
    slug,
    name: project.title,
    description: project.summary,
    image: project.cover_url ?? undefined,
    keywords: project.tech_tags,
    datePublished: project.created_at,
    dateModified: project.updated_at,
  });

  const breadcrumbSchema = breadcrumbListJsonLd(SITE_URL, [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.title, path: `/projects/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const related = pickRelatedProjects(project, await fetchAllProjects());
  const overviewParagraphs = splitPlainTextParagraphs(project.description);

  return (
    <div className="py-32">
      <ProjectJsonLd project={project} slug={slug} />
      <SlugViewTracker slug={slug} />
      <div className="mx-auto max-w-3xl px-(--container-padding)">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Projects", href: "/projects" },
            { label: project.title },
          ]}
        />

        <h1 className="text-h1 mt-6 font-bold tracking-tight">{project.title}</h1>
        <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
          {project.summary}
        </p>
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-accent font-medium">{project.role}</span>
          <span>·</span>
          <span className="capitalize">{project.type.replace("-", " ")}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {project.github_url && (
            <TrackedExternalLink
              href={project.github_url}
              destination="github"
              location="project_detail"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            >
              <GitHubIcon className="h-4 w-4" />
              Source
            </TrackedExternalLink>
          )}
          {project.live_url && (
            <TrackedExternalLink
              href={project.live_url}
              destination="live_demo"
              location="project_detail"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Live Demo
            </TrackedExternalLink>
          )}
          {project.playstore_url && (
            <TrackedExternalLink
              href={project.playstore_url}
              destination="playstore"
              location="project_detail"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Play Store
            </TrackedExternalLink>
          )}
          {project.appstore_url && (
            <TrackedExternalLink
              href={project.appstore_url}
              destination="appstore"
              location="project_detail"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              App Store
            </TrackedExternalLink>
          )}
        </div>

        <div className="bg-muted relative mt-8 aspect-video overflow-hidden rounded-2xl">
          {project.cover_url ? (
            <Image
              src={project.cover_url}
              alt={project.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          ) : null}
        </div>

        <section className="mt-12">
          <h2 className="text-accent text-lg font-semibold tracking-wider uppercase">
            Overview
          </h2>
          <div className="text-muted-foreground mt-3 space-y-4 leading-relaxed">
            {overviewParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-accent text-lg font-semibold tracking-wider uppercase">
            Tech Stack
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.tech_tags.map((t) => (
              <span
                key={t}
                className="bg-accent/10 text-accent rounded-full px-3 py-1 font-mono text-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        <RelatedProjects projects={related} />
      </div>
    </div>
  );
}
