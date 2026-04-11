import type { Metadata } from "next";
import { BarChart3, Users, Eye, Globe, MonitorSmartphone, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Public analytics dashboard for khubaibqaiser.com — real-time visitor metrics, traffic sources, and performance data.",
};

const placeholderStats = [
  { icon: Users, label: "Total Visitors", value: "—" },
  { icon: Eye, label: "Page Views", value: "—" },
  { icon: Globe, label: "Countries", value: "—" },
  { icon: MonitorSmartphone, label: "Devices", value: "—" },
  { icon: BarChart3, label: "Avg. Session", value: "—" },
  { icon: Zap, label: "LCP", value: "—" },
];

export default function AnalyticsPage() {
  return (
    <div className="py-32">
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <h1 className="text-[length:var(--text-h1)] font-bold tracking-tight">
          Site Analytics
        </h1>
        <p className="mt-3 max-w-xl text-[length:var(--text-body-lg)] text-muted-foreground">
          Real-time metrics for khubaibqaiser.com — demonstrating data
          visualization and analytics pipeline skills.
        </p>

        {/* Stats grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {placeholderStats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder charts */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-6">
            <h3 className="font-semibold">Visitor Trends</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily visitors over the past 30 days
            </p>
            <div className="mt-6 flex h-48 items-center justify-center text-sm text-muted-foreground/50">
              Charts will be powered by PostHog + Recharts
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-6">
            <h3 className="font-semibold">Traffic Sources</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Where visitors come from
            </p>
            <div className="mt-6 flex h-48 items-center justify-center text-sm text-muted-foreground/50">
              Donut chart coming in Phase 4
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-6">
            <h3 className="font-semibold">Top Pages</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Most visited pages
            </p>
            <div className="mt-6 flex h-48 items-center justify-center text-sm text-muted-foreground/50">
              Bar chart coming in Phase 4
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-6">
            <h3 className="font-semibold">Core Web Vitals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              LCP, INP, CLS from real users
            </p>
            <div className="mt-6 flex h-48 items-center justify-center text-sm text-muted-foreground/50">
              Gauge charts from Vercel Analytics — Phase 4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
