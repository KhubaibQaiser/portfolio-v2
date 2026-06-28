"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LogOut, RefreshCw, Settings } from "lucide-react";
import { purgeWebCache } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";

export function SidebarSettingsMenu() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSignOut() {
    window.location.assign("/auth/logout");
  }

  async function handlePurgeCache() {
    setPurging(true);
    const result = await runServerAction(() => purgeWebCache(), toast, {
      successMessage: "Site cache refreshed",
    });
    setPurging(false);
    if (result.success) setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>

      {open ? (
        <div
          role="menu"
          className="border-border bg-background absolute right-2 bottom-full left-2 mb-1 overflow-hidden rounded-lg border shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            disabled={purging}
            onClick={handlePurgeCache}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {purging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Revalidate site cache
          </button>
          <div className="border-border border-t" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
