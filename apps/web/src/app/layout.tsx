import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
import { fetchSiteConfig } from "@/lib/data";
import "@/styles/globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khubaibqaiser.com";

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
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${config.name} — ${config.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.name} | ${config.title}`,
      description: config.description,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    alternates: {
      canonical: SITE_URL,
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
    sameAs: socialLinks.map((l) => l.url),
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
  const navLinks = config.nav_links as unknown as Array<{ label: string; href: string }>;
  const socialLinks = config.social_links as unknown as Array<{ platform: string; url: string; label: string }>;

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <JsonLd config={config} siteUrl={SITE_URL} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
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
            <Navbar name={config.name} navLinks={navLinks} />
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
