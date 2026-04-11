import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-56">
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-20 md:pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
