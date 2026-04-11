"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type SocialLink = { platform: string; url: string; label: string };

type SiteConfigContextValue = {
  email: string;
  socialLinks: SocialLink[];
};

const SiteConfigContext = createContext<SiteConfigContextValue>({
  email: "",
  socialLinks: [],
});

export function SiteConfigProvider({
  email,
  socialLinks,
  children,
}: SiteConfigContextValue & { children: ReactNode }) {
  return (
    <SiteConfigContext value={{ email, socialLinks }}>
      {children}
    </SiteConfigContext>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
