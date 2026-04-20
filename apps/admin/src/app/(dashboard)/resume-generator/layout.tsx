import type { ReactNode } from "react";

/**
 * Wider canvas than `(main)` max-w-4xl — JD, options, preview, and history.
 */
export default function ResumeGeneratorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-20 md:pt-8">
      {children}
    </div>
  );
}
