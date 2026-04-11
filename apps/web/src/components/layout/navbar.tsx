"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@portfolio/ui/theme-toggle";
import { NAV_LINKS, SITE } from "@portfolio/shared/constants";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
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

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled ? "glass shadow-sm" : "bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-[var(--container-max)] items-center justify-between px-[var(--container-padding)]"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-70"
        >
          {SITE.name.split(" ")[0]}
          <span className="text-accent">.</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "relative px-3 py-2 text-sm font-medium text-muted-foreground",
                "transition-colors duration-200 hover:text-foreground",
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="font-mono text-xs text-accent opacity-70">
                0{i + 1}.
              </span>{" "}
              {link.label}
            </a>
          ))}
          <a
            href="/resume"
            className={cn(
              "ml-2 rounded-full border border-accent px-4 py-1.5",
              "text-sm font-medium text-accent transition-all duration-200",
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

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-foreground"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass fixed inset-0 top-16 z-40 flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="text-lg font-medium text-foreground"
              >
                <span className="font-mono text-sm text-accent">0{i + 1}.</span>{" "}
                {link.label}
              </motion.a>
            ))}
            <motion.a
              href="/resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: NAV_LINKS.length * 0.05, duration: 0.3 }}
              onClick={() => setMobileOpen(false)}
              className="rounded-full border border-accent px-6 py-2 text-sm font-medium text-accent"
            >
              Resume
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
