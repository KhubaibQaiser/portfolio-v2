"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#fafafa",
          color: "#0f1117",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "1rem",
              color: "#666",
              fontSize: "1.125rem",
            }}
          >
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "0.5rem",
                color: "#999",
                fontSize: "0.75rem",
                fontFamily: "monospace",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              backgroundColor: "#0f1117",
              color: "#fafafa",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
