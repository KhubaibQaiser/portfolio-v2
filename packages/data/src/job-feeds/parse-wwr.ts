import type { NormalizedJob } from "./types";
import { isWithinRecency } from "./types";

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match?.[1] ? decodeEntities(match[1].trim()) : "";
}

export function parseWwrRss(
  xml: string,
  recencyDays: number,
  now = new Date(),
): NormalizedJob[] {
  const items = xml.split(/<item>/i).slice(1);
  const out: NormalizedJob[] = [];
  for (const item of items) {
    const rawTitle = tag(item, "title");
    const link = tag(item, "link") || tag(item, "guid");
    const pubDate = tag(item, "pubDate");
    if (!rawTitle || !link || !pubDate) continue;
    const posted_at = new Date(pubDate).toISOString();
    if (!isWithinRecency(posted_at, recencyDays, now)) continue;
    const split = rawTitle.includes(":") ? rawTitle.split(":") : [rawTitle];
    const company = split[0]?.trim() || "Unknown";
    const title = split.slice(1).join(":").trim() || rawTitle;
    const slug = link.replace(/\/+$/, "").split("/").pop() ?? link;
    out.push({
      source: "wwr",
      source_id: slug,
      company,
      title,
      location: tag(item, "region") || "Remote",
      remote: true,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      apply_url: link,
      jd_text: tag(item, "description"),
      posted_at,
    });
  }
  return out;
}
