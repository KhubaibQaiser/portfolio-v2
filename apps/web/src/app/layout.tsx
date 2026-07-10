import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { PostHogAnalyticsProvider } from "@/components/analytics/posthog-provider";
import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import { PostHogThemeCapture } from "@/components/analytics/posthog-theme-capture";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SmoothScroll } from "@portfolio/ui/smooth-scroll";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { CommandPalette } from "@/components/layout/command-palette";
import { SiteConfigProvider } from "@/components/layout/site-config-provider";
import { MAIN_NAV_LINKS } from "@portfolio/shared/constants";
import { fetchSiteConfig } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { env } from "@/lib/env";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchSiteConfig();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: `%s | ${config.name}`,
      default: `${config.name} | ${config.title}`,
    },
    description: config.description,
    keywords: [
      "Senior Software Engineer",
      "React",
      "Next.js",
      "TypeScript",
      "React Native",
      "AWS",
      "Full Stack Developer",
      "Remote Engineer",
      config.name,
    ],
    authors: [{ name: config.name, url: SITE_URL }],
    creator: config.name,
    openGraph: {
      type: "profile",
      locale: "en_US",
      url: SITE_URL,
      siteName: config.name,
      title: `${config.name} | ${config.title}`,
      description: config.description,
      // images intentionally omitted — populated from opengraph-image.tsx
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.name} | ${config.title}`,
      description: config.description,
      // images intentionally omitted — populated from twitter-image.tsx
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    // Populated once GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION are set
    // (see Cloud Agents / deploy secrets) — omitted entirely until then so no
    // empty verification meta tags are emitted.
    verification: {
      google: env.GOOGLE_SITE_VERIFICATION,
      other: env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": env.BING_SITE_VERIFICATION }
        : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

function JsonLd({
  config,
  siteUrl,
}: {
  config: Awaited<ReturnType<typeof fetchSiteConfig>>;
  siteUrl: string;
}) {
  const socialLinks = config.social_links as unknown as Array<{ url: string }>;
  const personSchema = {
    "@context": "https://schema.org",
    "@type": ["Person", "ProfilePage"],
    "@id": `${siteUrl}/#person`,
    name: config.name,
    url: siteUrl,
    jobTitle: config.title,
    description: config.description,
    email: config.email,
    // Include the canonical site URL alongside external profiles (e.g. GitHub, LinkedIn) so
    // Google's Knowledge Graph can tie the entity back to the homepage, not just third parties.
    sameAs: [...new Set([...socialLinks.map((l) => l.url), siteUrl])],
    knowsAbout: [
      "React",
      "Next.js",
      "TypeScript",
      "Node.js",
      "AWS",
      "React Native",
      "System Design",
      "Tailwind CSS",
      "GraphQL",
      "Docker",
      "CI/CD",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: config.location.split(",")[0]?.trim(),
      addressCountry: "PK",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.name,
    url: siteUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await fetchSiteConfig();
  const socialLinks = config.social_links as unknown as Array<{
    platform: string;
    url: string;
    label: string;
  }>;

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="LLM site summary"
        />
        <JsonLd config={config} siteUrl={SITE_URL} />
      </head>
      <body className="bg-background min-h-screen font-sans antialiased">
        <ThemeProvider>
          <PostHogAnalyticsProvider>
            <PostHogThemeCapture />
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            <SmoothScroll>
              <a href="#main" className="skip-to-content">
                Skip to content
              </a>
              <Navbar name={config.name} navLinks={MAIN_NAV_LINKS} />
              <main id="main" className="relative">
                {children}
              </main>
              <Footer name={config.name} socialLinks={socialLinks} />
              <SiteConfigProvider email={config.email} socialLinks={socialLinks}>
                <ChatBubble />
                <CommandPalette />
              </SiteConfigProvider>
            </SmoothScroll>
          </PostHogAnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
