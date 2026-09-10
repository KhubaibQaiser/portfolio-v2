import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getContentRepository } from "@portfolio/data";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getContentRepository()
    .getSiteConfig()
    .catch(() => null);
  const name = config?.name?.trim() || "Portfolio";

  return {
    title: `Admin | ${name} Portfolio`,
    description: "Content management dashboard",
    robots: { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
