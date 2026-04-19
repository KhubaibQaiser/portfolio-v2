"use client";

import { GitHubIcon, LinkedInIcon, TwitterIcon, InstagramIcon } from "@portfolio/ui/icons";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";

type SocialLink = {
  platform: string;
  url: string;
  label: string;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
};

export function FooterSocialLinks({ socialLinks }: { socialLinks: SocialLink[] }) {
  return (
    <div className="flex items-center gap-4">
      {socialLinks.map(({ platform, url, label }) => {
        const Icon = iconMap[platform];
        if (!Icon) return null;
        return (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
            aria-label={label}
            onClick={() =>
              capturePortfolioEvent(PortfolioEvents.outboundLink, {
                destination: platform,
                location: "footer",
                link_domain: (() => {
                  try {
                    return new URL(url).hostname;
                  } catch {
                    return undefined;
                  }
                })(),
              })
            }
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
}
