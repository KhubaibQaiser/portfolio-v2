"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  Monitor,
  FileText,
  User,
  Briefcase,
  Zap,
  FolderOpen,
  Mail,
  Github,
  Linkedin,
  Home,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SOCIAL_LINKS, SITE } from "@portfolio/shared/constants";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    [],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="flex items-start justify-center pt-[20vh]">
        <Command
          className={cn(
            "relative w-full max-w-lg overflow-hidden rounded-2xl border border-border",
            "bg-background shadow-2xl",
          )}
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              placeholder="Type a command or search..."
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="px-1 pb-2">
              <CommandItem icon={Home} label="Home" onSelect={() => runCommand(() => router.push("/"))} />
              <CommandItem icon={FolderOpen} label="Projects" onSelect={() => runCommand(() => router.push("/projects"))} />
              <CommandItem icon={FileText} label="Resume" onSelect={() => runCommand(() => router.push("/resume"))} />
              <CommandItem icon={BarChart3} label="Analytics" onSelect={() => runCommand(() => router.push("/analytics"))} />
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading="Sections" className="px-1 pb-2">
              <CommandItem icon={User} label="About" onSelect={() => runCommand(() => { document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); })} />
              <CommandItem icon={Zap} label="Skills" onSelect={() => runCommand(() => { document.getElementById("skills")?.scrollIntoView({ behavior: "smooth" }); })} />
              <CommandItem icon={Briefcase} label="Experience" onSelect={() => runCommand(() => { document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" }); })} />
              <CommandItem icon={Mail} label="Contact" onSelect={() => runCommand(() => { document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); })} />
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading="Theme" className="px-1 pb-2">
              <CommandItem icon={Sun} label="Light Mode" onSelect={() => runCommand(() => setTheme("light"))} />
              <CommandItem icon={Moon} label="Dark Mode" onSelect={() => runCommand(() => setTheme("dark"))} />
              <CommandItem icon={Monitor} label="System Theme" onSelect={() => runCommand(() => setTheme("system"))} />
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading="Links" className="px-1 pb-2">
              <CommandItem icon={Github} label="GitHub" onSelect={() => runCommand(() => window.open(SOCIAL_LINKS.github, "_blank"))} />
              <CommandItem icon={Linkedin} label="LinkedIn" onSelect={() => runCommand(() => window.open(SOCIAL_LINKS.linkedin, "_blank"))} />
              <CommandItem icon={Mail} label="Copy Email" onSelect={() => runCommand(() => navigator.clipboard.writeText(SITE.email))} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors data-[selected=true]:bg-accent/10 data-[selected=true]:text-foreground"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Command.Item>
  );
}
