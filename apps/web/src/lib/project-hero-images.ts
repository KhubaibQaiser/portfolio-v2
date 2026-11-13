import type { Project } from "@portfolio/shared/schemas";

/** Cover first, then the gallery; every image has alt text. */
export function projectHeroImages(
  project: Pick<Project, "title" | "cover_url" | "gallery">,
): Array<{ url: string; alt: string }> {
  const images: Array<{ url: string; alt: string }> = [];
  if (project.cover_url) images.push({ url: project.cover_url, alt: project.title });
  (project.gallery ?? []).forEach((image, i) =>
    images.push({
      url: image.url,
      alt: image.alt || `${project.title} screenshot ${i + 1}`,
    }),
  );
  return images;
}
