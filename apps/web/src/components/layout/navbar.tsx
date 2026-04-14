"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@portfolio/ui/theme-toggle";

type NavLink = { label: string; href: string };

type NavbarProps = {
  name: string;
  navLinks: NavLink[];
};

export function Navbar({ name, navLinks }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const firstName = name.split(" ")[0];

  return (
    <header
      className={cn(
        "glass-header fixed top-0 right-0 left-0 z-50 backdrop-blur-[10px] transition-shadow duration-500",
        scrolled && "shadow-lg",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-[var(--container-max)] items-center justify-between px-[var(--container-padding)]"
        role="navigation"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="text-foreground text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          {firstName}
          <span className="text-accent">.</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-muted-foreground relative px-3 py-2 text-sm font-medium",
                "hover:text-foreground transition-colors duration-200",
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-accent font-mono text-xs opacity-70">0{i + 1}.</span>{" "}
              {link.label}
            </a>
          ))}
          <a
            href="/resume"
            className={cn(
              "border-accent ml-2 rounded-full border px-4 py-1.5",
              "text-accent text-sm font-medium transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              "active:scale-95",
            )}
          >
            Resume
          </a>
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="bg-muted/50 text-foreground flex h-9 w-9 items-center justify-center rounded-full"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass fixed inset-0 top-16 z-40 flex flex-col items-center justify-center gap-8 backdrop-blur-[24px] md:hidden"
          >
            {navLinks.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="text-foreground text-lg font-medium"
              >
                <span className="text-accent font-mono text-sm">0{i + 1}.</span>{" "}
                {link.label}
              </motion.a>
            ))}
            <motion.a
              href="/resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navLinks.length * 0.05, duration: 0.3 }}
              onClick={() => setMobileOpen(false)}
              className="border-accent text-accent rounded-full border px-6 py-2 text-sm font-medium"
            >
              Resume
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
