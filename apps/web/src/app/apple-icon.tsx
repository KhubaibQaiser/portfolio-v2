import { ImageResponse } from "next/og";
import { fetchSiteConfig } from "@/lib/data";
import { renderMonogram } from "@/lib/og-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const config = await fetchSiteConfig();

  return new ImageResponse(
    renderMonogram({ initial: config.name.charAt(0), size: size.width }),
    { ...size },
  );
}
