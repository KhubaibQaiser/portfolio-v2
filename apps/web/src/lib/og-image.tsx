import type { ReactElement } from "react";

// Kept intentionally simple/typographic — these are programmatically generated
// placeholders so social previews and favicons aren't broken. Swap for a
// designer-made asset later by replacing the JSX below; no metadata wiring
// needs to change since the routes stay the same.
const BACKGROUND = "#0b0d12";
const ACCENT = "#5b8cff";
const FOREGROUND = "#f5f6f8";
const MUTED = "#9aa4b2";

export function renderOgCard({
  eyebrow,
  heading,
  description,
}: {
  eyebrow: string;
  heading: string;
  description?: string;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: BACKGROUND,
        color: FOREGROUND,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: ACCENT,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: ACCENT,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 80, fontWeight: 700, marginTop: 28 }}>
        {heading}
      </div>
      {description && (
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: MUTED,
            marginTop: 20,
            maxWidth: 940,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

export function renderMonogram({
  initial,
  size,
}: {
  initial: string;
  size: number;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: Math.round(size * 0.55),
          fontWeight: 700,
          color: ACCENT,
          fontFamily: "sans-serif",
        }}
      >
        {initial}
      </div>
    </div>
  );
}
