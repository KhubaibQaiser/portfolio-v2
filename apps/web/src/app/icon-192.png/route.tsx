import { ImageResponse } from "next/og";
import { fetchSiteConfig } from "@/lib/data";
import { renderMonogram } from "@/lib/og-image";

export const dynamic = "force-static";

const SIZE = 192;

export async function GET() {
  const config = await fetchSiteConfig();

  return new ImageResponse(
    renderMonogram({ initial: config.name.charAt(0), size: SIZE }),
    {
      width: SIZE,
      height: SIZE,
    },
  );
}
