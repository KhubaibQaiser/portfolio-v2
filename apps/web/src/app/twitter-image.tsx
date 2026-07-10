import { ImageResponse } from "next/og";
import { fetchSiteConfig } from "@/lib/data";
import { renderOgCard } from "@/lib/og-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const config = await fetchSiteConfig();

  return new ImageResponse(
    renderOgCard({
      eyebrow: config.title,
      heading: config.name,
      description: config.description,
    }),
    { ...size },
  );
}
