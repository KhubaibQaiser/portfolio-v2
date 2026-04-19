"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function Error({
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
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-accent font-mono text-6xl font-bold">Oops</h1>
      <h2 className="text-h2 mt-4 font-semibold tracking-tight">Something went wrong</h2>
      <p className="text-body-lg text-muted-foreground mt-3 max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest && (
        <p className="text-muted-foreground/50 mt-2 font-mono text-xs">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="bg-accent text-accent-foreground mt-8 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
      >
        Try Again
      </button>
    </div>
  );
}
