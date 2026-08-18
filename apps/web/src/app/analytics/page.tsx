import type { Metadata, ResolvingMetadata } from "next";
import { BarChart3, Users, Eye, Globe, MonitorSmartphone, Zap } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(
  _props: object,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const metadata = await buildPageMetadata(parent, {
    title: "Analytics",
    description:
      "Public analytics dashboard for khubaibqaiser.com — real-time visitor metrics, traffic sources, and performance data.",
    path: "/analytics",
  });

  // Placeholder/thin content (all stats are "—", charts are "coming in Phase 4") —
  // keep it reachable for visitors but excluded from search results until it
  // has real data. Also dropped from sitemap.ts for the same reason.
  return { ...metadata, robots: { index: false, follow: false } };
}

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
      <div className="max-w-container mx-auto px-(--container-padding)">
        <h1 className="text-h1 font-bold tracking-tight">Site Analytics</h1>
        <p className="text-body-lg text-muted-foreground mt-3 max-w-xl">
          Real-time metrics for khubaibqaiser.com — demonstrating data visualization and
          analytics pipeline skills.
        </p>

        {/* Stats grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {placeholderStats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="border-border/50 bg-muted/20 flex items-center gap-4 rounded-xl border p-6"
            >
              <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon className="text-accent h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-muted-foreground text-sm">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder charts */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="border-border/50 bg-muted/20 rounded-xl border p-6">
            <h2 className="font-semibold">Visitor Trends</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Daily visitors over the past 30 days
            </p>
            <div className="text-muted-foreground/50 mt-6 flex h-48 items-center justify-center text-sm">
              Charts will be powered by PostHog + Recharts
            </div>
          </div>
          <div className="border-border/50 bg-muted/20 rounded-xl border p-6">
            <h2 className="font-semibold">Traffic Sources</h2>
            <p className="text-muted-foreground mt-1 text-sm">Where visitors come from</p>
            <div className="text-muted-foreground/50 mt-6 flex h-48 items-center justify-center text-sm">
              Donut chart coming in Phase 4
            </div>
          </div>
          <div className="border-border/50 bg-muted/20 rounded-xl border p-6">
            <h2 className="font-semibold">Top Pages</h2>
            <p className="text-muted-foreground mt-1 text-sm">Most visited pages</p>
            <div className="text-muted-foreground/50 mt-6 flex h-48 items-center justify-center text-sm">
              Bar chart coming in Phase 4
            </div>
          </div>
          <div className="border-border/50 bg-muted/20 rounded-xl border p-6">
            <h2 className="font-semibold">Core Web Vitals</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              LCP, INP, CLS from real users
            </p>
            <div className="text-muted-foreground/50 mt-6 flex h-48 items-center justify-center text-sm">
              Core Web Vitals gauges — Phase 4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
