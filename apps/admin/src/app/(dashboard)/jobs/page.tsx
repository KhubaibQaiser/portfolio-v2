import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { JobsTable } from "./jobs-table";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  return (
    <>
      <div className="flex items-center gap-3">
        <Search className="text-accent h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        Free-board ingest scored against your preferences and CMS facts. Apply stays
        human-in-the-loop.
      </p>
      <JobsTable />
    </>
  );
}
