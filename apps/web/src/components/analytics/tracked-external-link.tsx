"use client";

import type { ComponentProps, ReactNode } from "react";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";

type TrackedExternalLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  destination: string;
  location: string;
  children: ReactNode;
};

export function TrackedExternalLink({
  href,
  destination,
  location,
  children,
  onClick,
  ...rest
}: TrackedExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
      onClick={(e) => {
        try {
          const host = new URL(href).hostname;
          capturePortfolioEvent(PortfolioEvents.outboundLink, {
            destination,
            location,
            link_domain: host,
          });
        } catch {
          capturePortfolioEvent(PortfolioEvents.outboundLink, {
            destination,
            location,
          });
        }
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
