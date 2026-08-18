import type { SocialLink } from "@portfolio/shared/schemas";

const PROFILE_URL_RE = /^https?:\/\//i;

/** Profile URLs for schema.org `sameAs` (http(s) only; never tel/mailto/self). */
export function sameAsProfileUrls(
  socialLinks: Array<Pick<SocialLink, "url">>,
  siteUrl: string,
): string[] {
  const canonical = siteUrl.replace(/\/$/, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of socialLinks) {
    const url = link.url.trim();
    if (!PROFILE_URL_RE.test(url)) continue;
    const normalized = url.replace(/\/$/, "");
    if (normalized === canonical) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(url);
  }
  return out;
}

export function twitterCreatorHandle(
  socialLinks: Array<Pick<SocialLink, "platform" | "url">>,
): string | undefined {
  const link = socialLinks.find(
    (l) => /^(twitter|x)$/i.test(l.platform) || /(?:twitter\.com|x\.com)\//i.test(l.url),
  );
  if (!link) return undefined;
  const match = link.url.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i);
  return match?.[1] ? `@${match[1]}` : undefined;
}

export function knowsAboutFromSkills(
  skills: Array<{ name: string; years: number; sort_order: number }>,
  limit = 16,
): string[] {
  const sorted = [...skills].sort((a, b) => {
    if (b.years !== a.years) return b.years - a.years;
    return a.sort_order - b.sort_order;
  });
  const names: string[] = [];
  const seen = new Set<string>();
  for (const skill of sorted) {
    const name = skill.name.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

type PersonJsonLdInput = {
  siteUrl: string;
  name: string;
  jobTitle: string;
  description: string;
  email: string;
  location: string;
  socialLinks: Array<Pick<SocialLink, "url">>;
  knowsAbout: string[];
};

export function personJsonLd(input: PersonJsonLdInput) {
  const locality = input.location.split(",")[0]?.trim();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${input.siteUrl}/#person`,
    name: input.name,
    url: input.siteUrl,
    jobTitle: input.jobTitle,
    description: input.description,
    email: input.email,
    sameAs: sameAsProfileUrls(input.socialLinks, input.siteUrl),
    knowsAbout: input.knowsAbout,
    ...(locality
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: locality,
          },
        }
      : {}),
  };
}

export function profilePageJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${siteUrl}/#profile`,
    url: siteUrl,
    mainEntity: { "@id": `${siteUrl}/#person` },
  };
}

export function websiteJsonLd(input: {
  siteUrl: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.siteUrl,
    description: input.description,
    inLanguage: "en",
    publisher: { "@id": `${input.siteUrl}/#person` },
  };
}

export function breadcrumbListJsonLd(
  siteUrl: string,
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function creativeWorkJsonLd(input: {
  siteUrl: string;
  slug: string;
  name: string;
  description: string;
  image?: string;
  keywords: string[];
  datePublished: string;
  dateModified: string;
}) {
  const url = `${input.siteUrl}/projects/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#creativework`,
    name: input.name,
    description: input.description,
    url,
    image: input.image,
    keywords: input.keywords.join(", "),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: { "@id": `${input.siteUrl}/#person` },
    creator: { "@id": `${input.siteUrl}/#person` },
  };
}

export function itemListJsonLd(input: {
  siteUrl: string;
  name: string;
  items: Array<{ name: string; slug: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${input.siteUrl}/projects/${item.slug}`,
    })),
  };
}
