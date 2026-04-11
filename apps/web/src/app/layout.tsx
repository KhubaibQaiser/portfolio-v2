import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { CommandPalette } from "@/components/layout/command-palette";
import { SITE, SOCIAL_LINKS } from "@portfolio/shared/constants";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    template: "%s | Khubaib Qaiser",
    default: "Khubaib Qaiser | Senior Software Engineer",
  },
  description: SITE.description,
  keywords: [
    "Senior Software Engineer",
    "React",
    "Next.js",
    "TypeScript",
    "React Native",
    "AWS",
    "Full Stack Developer",
    "Remote Engineer",
    "Pakistan",
    "Khubaib Qaiser",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  openGraph: {
    type: "profile",
    locale: "en_US",
    url: SITE.url,
    siteName: SITE.name,
    title: "Khubaib Qaiser | Senior Software Engineer",
    description: SITE.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Khubaib Qaiser — Senior Software Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Khubaib Qaiser | Senior Software Engineer",
    description: SITE.description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  alternates: {
    canonical: SITE.url,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

function JsonLd() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": ["Person", "ProfilePage"],
    "@id": `${SITE.url}/#person`,
    name: SITE.name,
    url: SITE.url,
    jobTitle: SITE.title,
    description: SITE.description,
    email: SITE.email,
    sameAs: Object.values(SOCIAL_LINKS),
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
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Quaid-i-Azam University",
      sameAs: "https://www.qau.edu.pk",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Islamabad",
      addressCountry: "PK",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/projects?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <JsonLd />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <SmoothScroll>
            <a href="#main" className="skip-to-content">
              Skip to content
            </a>
            <Navbar />
            <main id="main" className="relative">
              {children}
            </main>
            <Footer />
            <ChatBubble />
            <CommandPalette />
          </SmoothScroll>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
