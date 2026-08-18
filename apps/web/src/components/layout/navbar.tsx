"use client";

import { useState, useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";
import { ThemeToggle } from "@portfolio/ui/theme-toggle";
import { isHashNavHref } from "@portfolio/shared/constants";

function trackNav(href: string, label: string) {
  capturePortfolioEvent(PortfolioEvents.primaryNavClick, { href, label });
}

/** Strip `#` and ignore any duplicated hash segments from bad URL state. */
function normalizeSectionId(href: string): string {
  const trimmed = href.trim();
  const withoutLeading = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return withoutLeading.split("#")[0] ?? withoutLeading;
}

/** Section anchors from CMS are hash-only; they always target a home-page section. */
function toHomeSectionHref(href: string): string {
  return `/#${normalizeSectionId(href)}`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  window.history.replaceState(null, "", `/#${id}`);
}

function handleSectionNavClick(
  e: MouseEvent<HTMLAnchorElement>,
  href: string,
  label: string,
  onAfterNavigate?: () => void,
) {
  trackNav(href, label);
  const id = normalizeSectionId(href);

  if (window.location.pathname !== "/") {
    return;
  }

  e.preventDefault();
  scrollToSection(id);
  onAfterNavigate?.();
}

type NavLink = { label: string; href: string };

const MotionLink = motion.create(Link);

const MOBILE_MENU_ID = "mobile-nav-menu";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FOCUS_RING =
  "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden";

type NavbarProps = {
  name: string;
  navLinks: NavLink[];
};

export function Navbar({ name, navLinks }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const wasMobileOpen = useRef(false);

  useEffect(() => {
    const { pathname, hash } = window.location;
    if (!hash) return;
    const id = hash.slice(1).split("#")[0];
    if (id && hash !== `#${id}`) {
      window.history.replaceState(null, "", `${pathname}#${id}`);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      wasMobileOpen.current = true;
      const frame = window.requestAnimationFrame(() => {
        menuPanelRef.current?.querySelector("a")?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (wasMobileOpen.current) {
      wasMobileOpen.current = false;
      menuButtonRef.current?.focus();
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (e.key !== "Tab") return;

      const header = menuButtonRef.current?.closest("header");
      const panel = menuPanelRef.current;
      if (!header || !panel) return;

      const focusable = [
        ...header.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ].filter((el) => el.getClientRects().length > 0);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inScope =
        (active instanceof HTMLElement && header.contains(active)) ||
        (active instanceof HTMLElement && panel.contains(active));

      if (e.shiftKey) {
        if (active === first || !inScope) {
          e.preventDefault();
          last?.focus();
        }
        return;
      }

      if (active === last || !inScope) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const firstName = name.split(" ")[0];

  return (
    <>
      <header
        className={cn(
          "glass-header fixed top-0 right-0 left-0 z-50 backdrop-blur-[10px] transition-shadow duration-500",
          scrolled && "shadow-lg",
        )}
      >
        <nav
          className="max-w-container mx-auto flex h-16 items-center justify-between px-(--container-padding)"
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
            {navLinks.map((link, i) =>
              isHashNavHref(link.href) ? (
                <Link
                  key={link.href}
                  href={toHomeSectionHref(link.href)}
                  onClick={(e) => handleSectionNavClick(e, link.href, link.label)}
                  className={cn(
                    "text-muted-foreground relative px-3 py-2 text-sm font-medium",
                    "hover:text-foreground transition-colors duration-200",
                  )}
                >
                  <span className="text-accent font-mono text-xs opacity-70">
                    0{i + 1}.
                  </span>{" "}
                  {link.label}
                </Link>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => trackNav(link.href, link.label)}
                  className={cn(
                    "text-muted-foreground relative px-3 py-2 text-sm font-medium",
                    "hover:text-foreground transition-colors duration-200",
                  )}
                >
                  <span className="text-accent font-mono text-xs opacity-70">
                    0{i + 1}.
                  </span>{" "}
                  {link.label}
                </Link>
              ),
            )}
            <Link
              href="/resume"
              onClick={() => trackNav("/resume", "Resume")}
              className={cn(
                "border-accent ml-2 rounded-full border px-4 py-1.5",
                "text-accent text-sm font-medium transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                "active:scale-95",
              )}
            >
              Resume
            </Link>
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "bg-muted/50 text-foreground flex h-9 w-9 items-center justify-center rounded-full",
                FOCUS_RING,
              )}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls={MOBILE_MENU_ID}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={menuPanelRef}
            id={MOBILE_MENU_ID}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col items-center justify-start gap-8 overflow-y-auto overscroll-contain px-6 py-8 backdrop-blur-xl md:hidden"
          >
            {navLinks.map((link, i) =>
              isHashNavHref(link.href) ? (
                <MotionLink
                  key={link.href}
                  href={toHomeSectionHref(link.href)}
                  onClick={(e) =>
                    handleSectionNavClick(e, link.href, link.label, () =>
                      setMobileOpen(false),
                    )
                  }
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn("text-foreground text-lg font-medium", FOCUS_RING)}
                >
                  <span className="text-accent font-mono text-sm">0{i + 1}.</span>{" "}
                  {link.label}
                </MotionLink>
              ) : (
                <MotionLink
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    trackNav(link.href, link.label);
                    setMobileOpen(false);
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn("text-foreground text-lg font-medium", FOCUS_RING)}
                >
                  <span className="text-accent font-mono text-sm">0{i + 1}.</span>{" "}
                  {link.label}
                </MotionLink>
              ),
            )}
            <MotionLink
              href="/resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navLinks.length * 0.05, duration: 0.3 }}
              onClick={() => {
                trackNav("/resume", "Resume");
                setMobileOpen(false);
              }}
              className={cn(
                "border-accent text-accent rounded-full border px-6 py-2 text-sm font-medium",
                FOCUS_RING,
              )}
            >
              Resume
            </MotionLink>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
