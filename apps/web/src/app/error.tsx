"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-mono text-6xl font-bold text-accent">Oops</h1>
      <h2 className="mt-4 text-[length:var(--text-h2)] font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="mt-3 max-w-md text-[length:var(--text-body-lg)] text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/50">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-all duration-200 hover:opacity-90 active:scale-95"
      >
        Try Again
      </button>
    </div>
  );
}
