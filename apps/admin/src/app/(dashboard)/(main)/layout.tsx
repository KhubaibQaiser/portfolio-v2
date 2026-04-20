import type { ReactNode } from "react";

/** Default dashboard pages: comfortable reading width for forms and lists. */
export default function MainDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-20 md:pt-8">{children}</div>
  );
}
