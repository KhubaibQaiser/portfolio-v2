import type { MetadataRoute } from "next";
import { fetchAllProjects, fetchResume, fetchSiteConfig } from "@/lib/data";
import { latestUpdatedAt } from "@/lib/latest-updated-at";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, siteConfig, resume] = await Promise.all([
    fetchAllProjects(),
    fetchSiteConfig(),
    fetchResume(),
  ]);

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}/projects/${project.slug}`,
    lastModified: new Date(project.updated_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const projectsIndexModified = latestUpdatedAt(projects.map((p) => p.updated_at));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(siteConfig.updated_at),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/resume`,
      lastModified: new Date(resume.updated_at),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: new Date(projectsIndexModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...projectEntries,
    // /analytics intentionally omitted — it's noindex (see analytics/page.tsx)
    // until it has real data instead of placeholder stats.
  ];
}
