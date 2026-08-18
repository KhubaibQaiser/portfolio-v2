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
import { DeferredWidgets } from "@/components/layout/deferred-widgets";
import { SiteConfigProvider } from "@/components/layout/site-config-provider";
import { MAIN_NAV_LINKS } from "@portfolio/shared/constants";
import type { SiteConfig, Skill, SocialLink } from "@portfolio/shared/schemas";
import { fetchSiteConfig, fetchSkills } from "@/lib/data";
import {
  knowsAboutFromSkills,
  personJsonLd,
  profilePageJsonLd,
  twitterCreatorHandle,
  websiteJsonLd,
} from "@/lib/json-ld";
import { SITE_URL } from "@/lib/seo";
import { env } from "@/lib/env";
import "@/styles/globals.css";

function asSocialLinks(config: SiteConfig): SocialLink[] {
  return config.social_links as unknown as SocialLink[];
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchSiteConfig();
  const socialLinks = asSocialLinks(config);
  const twitter = twitterCreatorHandle(socialLinks);

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
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.name} | ${config.title}`,
      description: config.description,
      ...(twitter ? { creator: twitter } : {}),
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
  skills,
  siteUrl,
}: {
  config: SiteConfig;
  skills: Skill[];
  siteUrl: string;
}) {
  const socialLinks = asSocialLinks(config);
  const personSchema = personJsonLd({
    siteUrl,
    name: config.name,
    jobTitle: config.title,
    description: config.description,
    email: config.email,
    location: config.location,
    socialLinks,
    knowsAbout: knowsAboutFromSkills(skills),
  });
  const profileSchema = profilePageJsonLd(siteUrl);
  const websiteSchema = websiteJsonLd({
    siteUrl,
    name: config.name,
    description: config.description,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, skills] = await Promise.all([fetchSiteConfig(), fetchSkills()]);
  const socialLinks = asSocialLinks(config);

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="LLM site summary"
        />
        <JsonLd config={config} skills={skills} siteUrl={SITE_URL} />
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
                <DeferredWidgets />
              </SiteConfigProvider>
            </SmoothScroll>
          </PostHogAnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
