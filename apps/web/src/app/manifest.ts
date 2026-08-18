import type { MetadataRoute } from "next";
import { fetchAbout, fetchSiteConfig } from "@/lib/data";

export const revalidate = 10;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [config, about] = await Promise.all([fetchSiteConfig(), fetchAbout()]);

  return {
    name: `${config.name} — ${config.title}`,
    short_name: config.name.split(" ")[0] ?? config.name,
    description: `${config.title} with ${about.years_experience}+ years of experience. ${config.description}`,
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0f1117",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
