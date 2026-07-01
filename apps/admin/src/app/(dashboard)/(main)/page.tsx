import {
  LayoutDashboard,
  Type,
  User,
  Briefcase,
  FolderOpen,
  Zap,
  FileText,
  MessageSquare,
  Settings,
  Image,
} from "lucide-react";
import { SectionCard } from "@/components/layout/section-card";

const sections = [
  { href: "/hero", label: "Hero", icon: Type, description: "Title, subtitle, CTAs" },
  { href: "/about", label: "About", icon: User, description: "Bio, photo, stats" },
  { href: "/experience", label: "Experience", icon: Briefcase, description: "6 roles" },
  { href: "/projects", label: "Projects", icon: FolderOpen, description: "30+ projects" },
  { href: "/skills", label: "Skills", icon: Zap, description: "Skill categories" },
  { href: "/resume", label: "Resume", icon: FileText, description: "ATS resume data" },
  { href: "/recommendations", label: "Recommendations", icon: MessageSquare, description: "LinkedIn recs" },
  { href: "/site-config", label: "Site Config", icon: Settings, description: "Links, meta" },
  { href: "/media", label: "Media Library", icon: Image, description: "Images, files" },
];

export default function DashboardPage() {
  return (
    <>
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <p className="mt-2 text-muted-foreground">
        Manage your portfolio content. Saves go to DynamoDB; the public site
        refreshes on its hourly cache window.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {sections.map(({ href, label, icon: Icon, description }) => (
          <SectionCard
            key={href}
            href={href}
            label={label}
            icon={<Icon className="text-accent h-5 w-5" />}
            description={description}
          />
        ))}
      </div>
    </>
  );
}
