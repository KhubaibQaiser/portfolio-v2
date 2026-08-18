import { ImageResponse } from "next/og";
import { fetchProjectBySlug, fetchSiteConfig } from "@/lib/data";
import { renderOgCard } from "@/lib/og-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 10;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, config] = await Promise.all([
    fetchProjectBySlug(slug),
    fetchSiteConfig(),
  ]);

  return new ImageResponse(
    renderOgCard({
      eyebrow: config.name,
      heading: project?.title ?? "Project",
      description: project?.summary ?? config.description,
    }),
    { ...size },
  );
}
