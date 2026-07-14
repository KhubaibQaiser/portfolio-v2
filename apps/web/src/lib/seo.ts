import type { Metadata, ResolvingMetadata } from "next";
import { env } from "@/lib/env";

/** Canonical production origin, used for canonical URLs, OG/Twitter images, and JSON-LD. */
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL ?? "https://khubaibqaiser.com";

type PageMetadataInput = {
  title: string;
  description: string;
  /** Route path starting with "/", e.g. "/projects" or "/projects/my-slug". */
  path: string;
  /** Page-specific social image; falls back to the inherited root OG/Twitter image when omitted. */
  image?: { url: string; width?: number; height?: number; alt?: string };
};

/**
 * Builds per-page canonical + Open Graph + Twitter metadata while preserving
 * inherited fields (siteName, locale, type, card) from the parent segment.
 * Next.js shallow-merges `openGraph`/`twitter` objects, so a page that sets
 * any sub-field without spreading `parent` would otherwise silently drop
 * fields like `siteName` set in the root layout.
 */
export async function buildPageMetadata(
  parent: ResolvingMetadata,
  input: PageMetadataInput,
): Promise<Metadata> {
  const previous = await parent;
  const canonical = `${SITE_URL}${input.path}`;
  const images = input.image ? [input.image] : previous.openGraph?.images;
  const twitterImages = input.image ? [input.image.url] : previous.twitter?.images;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      ...previous.openGraph,
      url: canonical,
      title: input.title,
      description: input.description,
      images,
    },
    twitter: {
      ...previous.twitter,
      title: input.title,
      description: input.description,
      images: twitterImages,
    },
  };
}
