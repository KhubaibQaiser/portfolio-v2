"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type SocialLink = { platform: string; url: string; label: string };

type SiteConfigContextValue = {
  name: string;
  email: string;
  socialLinks: SocialLink[];
};

const SiteConfigContext = createContext<SiteConfigContextValue>({
  name: "",
  email: "",
  socialLinks: [],
});

export function SiteConfigProvider({
  name,
  email,
  socialLinks,
  children,
}: SiteConfigContextValue & { children: ReactNode }) {
  return (
    <SiteConfigContext value={{ name, email, socialLinks }}>{children}</SiteConfigContext>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

/** First whitespace-separated token of a display name (navbar / chat chrome). */
export function firstNameFromDisplayName(name: string): string {
  const token = name.trim().split(/\s+/)[0];
  return token || name.trim() || "there";
}
