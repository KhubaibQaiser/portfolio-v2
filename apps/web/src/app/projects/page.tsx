import type { Metadata, ResolvingMetadata } from "next";
import { ProjectsGrid } from "@/components/sections/projects-grid";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { fetchAllProjects, fetchSiteConfig } from "@/lib/data";
import { itemListJsonLd } from "@/lib/json-ld";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export async function generateMetadata(
  _props: object,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const projects = await fetchAllProjects();
  return buildPageMetadata(parent, {
    title: "Projects",
    description: `${projects.length}+ web, mobile, and game case studies spanning React, Next.js, React Native, and AWS.`,
    path: "/projects",
  });
}

export const revalidate = 10;

export default async function ProjectsPage() {
  const [projects, config] = await Promise.all([fetchAllProjects(), fetchSiteConfig()]);

  const listSchema = itemListJsonLd({
    siteUrl: SITE_URL,
    name: `${config.name} projects`,
    items: projects.map((project) => ({ name: project.title, slug: project.slug })),
  });

  return (
    <div className="py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />
      <div className="max-w-container mx-auto px-(--container-padding)">
        <PageBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Projects" }]} />
        <h1 className="text-h1 mt-6 font-bold tracking-tight">All Projects</h1>
        <p className="text-body-lg text-muted-foreground mt-3 max-w-xl">
          A collection of projects I&apos;ve built throughout my career — from serverless
          cloud systems to educational games.
        </p>
      </div>
      <ProjectsGrid projects={projects} />
    </div>
  );
}
