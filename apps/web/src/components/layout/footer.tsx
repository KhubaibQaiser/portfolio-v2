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
    <footer className="border-border border-t py-12">
      <div className="max-w-container mx-auto flex flex-col items-center gap-6 px-(--container-padding)">
        <FooterSocialLinks socialLinks={socialLinks} />

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-muted-foreground text-sm">
            Designed & Built by{" "}
            <Link
              href="/"
              className="text-foreground hover:text-accent font-medium transition-colors"
            >
              {name}
            </Link>
          </p>
          <p className="text-muted-foreground/60 font-mono text-xs">
            Built with Next.js, TypeScript & Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
