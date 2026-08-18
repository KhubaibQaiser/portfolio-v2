import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * The wildcard rule below already allows every crawler, including AI bots not
 * listed by name. The named rules exist to make the site's AI-visibility
 * policy explicit (search + answer-engine bots, and major training/indexing
 * crawlers) rather than relying on the implicit wildcard allow.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/analytics"],
      },
      // AI search / answer engines
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      // Other major AI/training crawlers
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Amazonbot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "Meta-ExternalAgent", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
