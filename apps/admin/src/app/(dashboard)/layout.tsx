import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardProviders } from "@/components/providers/dashboard-providers";

/** CMS pages must read live DynamoDB at request time — never prerender with fixtures at build. */
export const dynamic = "force-dynamic";

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
