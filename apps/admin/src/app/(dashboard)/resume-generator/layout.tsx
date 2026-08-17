import type { ReactNode } from "react";

/**
 * Wider canvas than `(main)` max-w-4xl — JD, preview, and history.
 */
export default function ResumeGeneratorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-20 pb-12 md:pt-8">
      {children}
    </div>
  );
}
