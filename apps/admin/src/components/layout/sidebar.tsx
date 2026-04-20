"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Type,
  User,
  Briefcase,
  FolderOpen,
  Zap,
  FileText,
  MessageSquare,
  PenTool,
  Settings,
  Image,
  LogOut,
  Menu,
  X,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hero", label: "Hero", icon: Type },
  { href: "/about", label: "About", icon: User },
  { href: "/experience", label: "Experience", icon: Briefcase },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/resume-generator", label: "Resume AI", icon: Wand2 },
  { href: "/testimonials", label: "Testimonials", icon: MessageSquare },
  { href: "/blog", label: "Blog", icon: PenTool },
  { href: "/site-config", label: "Site Config", icon: Settings },
  { href: "/media", label: "Media", icon: Image },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <span className="text-sm font-semibold">Admin</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 flex h-full w-56 flex-col border-r border-border bg-background transition-transform duration-200",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="text-sm font-bold tracking-tight">
            Portfolio
            <span className="text-accent">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Exact segment match: `/resume` must not match `/resume-generator`
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
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
