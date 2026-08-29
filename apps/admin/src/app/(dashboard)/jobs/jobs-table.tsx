"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import {
  jobStatusEnum,
  type JobPosting,
  type JobStatus,
} from "@portfolio/shared/schemas";
import { cn } from "@/lib/utils";
import { runIngestNow } from "@/lib/job-actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";

const STATUSES = jobStatusEnum.options;

type JobsPageResponse = {
  items: JobPosting[];
  nextCursor: string | null;
  recommendedJobId: string | null;
};

const columnHelper = createColumnHelper<JobPosting>();

export function JobsTable() {
  const toast = useToast();
  const [status, setStatus] = useState<JobStatus>("new");
  const [items, setItems] = useState<JobPosting[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [recommendedJobId, setRecommendedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (cursor: string | null, replace: boolean) => {
      setLoading(true);
      const params = new URLSearchParams({ status });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) {
        setLoading(false);
        toast.error("Could not load jobs");
        return;
      }
      const body = (await response.json()) as JobsPageResponse;
      setRecommendedJobId(body.recommendedJobId);
      setNextCursor(body.nextCursor);
      setItems((current) => (replace ? body.items : [...current, ...body.items]));
      setLoading(false);
    },
    [status, toast],
  );

  useEffect(() => {
    void loadPage(null, true);
  }, [loadPage]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("company", { header: "Company" }),
      columnHelper.accessor("title", { header: "Title" }),
      columnHelper.accessor("location", { header: "Location" }),
      columnHelper.accessor((row) => row.sources[0]?.source ?? "", {
        id: "source",
        header: "Source",
      }),
      columnHelper.accessor("posted_at", {
        header: "Posted",
        cell: (info) => info.getValue().slice(0, 10),
      }),
      columnHelper.accessor("score", { header: "Score" }),
      columnHelper.accessor("band", { header: "Band" }),
      columnHelper.display({
        id: "recommended",
        header: "Rec",
        cell: (info) => (info.row.original.id === recommendedJobId ? "Yes" : ""),
      }),
      columnHelper.accessor("status", { header: "Status" }),
      columnHelper.display({
        id: "open",
        header: "",
        cell: (info) => (
          <Link
            className="text-accent hover:underline"
            href={`/jobs/${info.row.original.id}`}
          >
            Open
          </Link>
        ),
      }),
    ],
    [recommendedJobId],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtual = virtualItems.at(-1);
  useEffect(() => {
    if (!lastVirtual || loading || !nextCursor) return;
    if (lastVirtual.index >= rows.length - 8) {
      void loadPage(nextCursor, false);
    }
  }, [lastVirtual, loading, nextCursor, rows.length, loadPage]);

  async function onIngest() {
    setIngesting(true);
    const result = await runServerAction(() => runIngestNow(), toast);
    setIngesting(false);
    if (result.success) void loadPage(null, true);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize",
              status === value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void onIngest()}
          disabled={ingesting}
          className="bg-accent text-accent-foreground ml-auto rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {ingesting ? "Ingesting…" : "Run ingest now"}
        </button>
      </div>

      <div
        ref={parentRef}
        className="border-border max-h-[70vh] overflow-auto rounded-lg border"
      >
        <table className="w-full text-left text-sm">
          <thead className="bg-background sticky top-0 z-10">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-border border-b">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-muted-foreground px-3 py-2 font-medium"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody style={{ height: virtualizer.getTotalSize() }} className="relative">
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              return (
                <tr
                  key={row.id}
                  className="border-border/60 absolute w-full border-b"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && !loading ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No jobs in this status.
          </p>
        ) : null}
      </div>
    </div>
  );
}
