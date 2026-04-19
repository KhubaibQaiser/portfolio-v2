import Link from "next/link";
import { FooterSocialLinks } from "@/components/analytics/footer-social";

type SocialLink = {
  platform: string;
  url: string;
  label: string;
};

type FooterProps = {
  name: string;
  socialLinks: SocialLink[];
};

export function Footer({ name, socialLinks }: FooterProps) {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-container flex-col items-center gap-6 px-(--container-padding)">
        <FooterSocialLinks socialLinks={socialLinks} />

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
