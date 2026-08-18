import type { MetadataRoute } from "next";

/** Admin is a separate origin and must not appear in search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
