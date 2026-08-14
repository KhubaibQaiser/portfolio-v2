"use client";

import { GuardedLink } from "@/components/form";
import { usePathname } from "next/navigation";
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
  Menu,
  X,
  Wand2,
  LayoutTemplate,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarSettingsMenu } from "@/components/layout/sidebar-settings-menu";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hero", label: "Hero", icon: Type },
  { href: "/about", label: "About", icon: User },
  { href: "/experience", label: "Experience", icon: Briefcase },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/resume-layouts", label: "Resume layouts", icon: LayoutTemplate },
  { href: "/resume-generator", label: "Resume AI", icon: Wand2 },
  { href: "/recommendations", label: "Recommendations", icon: MessageSquare },
  { href: "/site-config", label: "Site Config", icon: Settings },
  { href: "/media", label: "Media", icon: Image },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="border-border bg-background fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b px-4 md:hidden">
        <span className="text-sm font-semibold">Admin</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-muted-foreground hover:text-foreground rounded-md p-2"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "border-border bg-background fixed top-0 left-0 z-40 flex h-full w-56 flex-col border-r transition-transform duration-200",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-border flex h-14 items-center border-b px-4">
          <GuardedLink href="/" className="text-sm font-bold tracking-tight">
            Portfolio
            <span className="text-accent">Admin</span>
          </GuardedLink>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Exact segment match: `/resume` must not match `/resume-generator`
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <GuardedLink
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </GuardedLink>
            );
          })}
        </nav>

        <div className="border-border border-t p-2">
          <SidebarSettingsMenu />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
