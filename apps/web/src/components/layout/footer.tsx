import Link from "next/link";
import { GitHubIcon, LinkedInIcon, TwitterIcon, InstagramIcon } from "@portfolio/ui/icons";

type SocialLink = {
  platform: string;
  url: string;
  label: string;
};

type FooterProps = {
  name: string;
  socialLinks: SocialLink[];
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
};

export function Footer({ name, socialLinks }: FooterProps) {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-[var(--container-max)] flex-col items-center gap-6 px-[var(--container-padding)]">
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
              >
                <Icon className="h-5 w-5" />
              </a>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-muted-foreground">
            Designed & Built by{" "}
            <Link
              href="/"
              className="font-medium text-foreground transition-colors hover:text-accent"
            >
              {name}
            </Link>
          </p>
          <p className="font-mono text-xs text-muted-foreground/60">
            Built with Next.js, TypeScript & Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
