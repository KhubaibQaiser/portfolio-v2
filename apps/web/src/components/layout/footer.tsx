import Link from "next/link";
import { Github, Linkedin, Twitter, Instagram } from "lucide-react";
import { SITE, SOCIAL_LINKS } from "@portfolio/shared/constants";

const socialIcons = [
  { href: SOCIAL_LINKS.github, icon: Github, label: "GitHub" },
  { href: SOCIAL_LINKS.linkedin, icon: Linkedin, label: "LinkedIn" },
  { href: SOCIAL_LINKS.twitter, icon: Twitter, label: "Twitter" },
  { href: SOCIAL_LINKS.instagram, icon: Instagram, label: "Instagram" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-[var(--container-max)] flex-col items-center gap-6 px-[var(--container-padding)]">
        {/* Social links */}
        <div className="flex items-center gap-4">
          {socialIcons.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        {/* Credit */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-muted-foreground">
            Designed & Built by{" "}
            <Link
              href="/"
              className="font-medium text-foreground transition-colors hover:text-accent"
            >
              {SITE.name}
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
