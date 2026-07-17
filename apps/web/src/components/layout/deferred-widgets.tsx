"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatBubble = dynamic(
  () => import("@/components/chat/chat-bubble").then((m) => m.ChatBubble),
  { ssr: false },
);

const CommandPalette = dynamic(
  () =>
    import("@/components/layout/command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);

/**
 * Loads chat + command palette after first paint so their JS stays off the
 * critical path for LCP / unused-JS audits.
 */
export function DeferredWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId: number | undefined;
    const fallbackId = window.setTimeout(() => setReady(true), 1500);

    if (typeof requestIdleCallback === "function") {
      idleId = requestIdleCallback(() => setReady(true), { timeout: 2000 });
    }

    return () => {
      window.clearTimeout(fallbackId);
      if (idleId !== undefined && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId);
      }
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <ChatBubble />
      <CommandPalette />
    </>
  );
}
