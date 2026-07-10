"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import "@/styles/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground m-0 flex min-h-screen items-center justify-center font-sans">
        <div className="p-8 text-center">
          <h1 className="text-5xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground mt-4 text-lg">
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p className="text-muted-foreground/70 mt-2 font-mono text-xs">
              Error ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="bg-foreground text-background mt-8 cursor-pointer rounded-full px-6 py-2.5 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
