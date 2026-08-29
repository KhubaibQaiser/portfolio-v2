import type { ReactNode } from "react";

export default function JobsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-20 pb-12 md:pt-8">
      {children}
    </div>
  );
}
