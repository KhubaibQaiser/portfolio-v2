import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardProviders } from "@/components/providers/dashboard-providers";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProviders>
      <div className="min-h-screen">
        <Sidebar />
        <div className="md:pl-56">{children}</div>
      </div>
    </DashboardProviders>
  );
}
