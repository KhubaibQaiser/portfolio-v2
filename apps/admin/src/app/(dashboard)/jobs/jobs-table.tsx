"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  jobBandEnum,
  jobStatusEnum,
  type JobBand,
  type JobPosting,
  type JobStatus,
} from "@portfolio/shared/schemas";
import type { JobStatusCounts } from "@portfolio/shared/ports";
import { runIngestNow, setJobStatus, snoozeJob } from "@/lib/job-actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { cn } from "@/lib/utils";
import { JobStatusPills } from "./job-status-pills";
import { JobRecommendedBanner } from "./job-recommended-banner";
import { JOB_QUEUE_GRID, JobQueueRow } from "./job-queue-row";

type JobsPageResponse = {
  items: JobPosting[];
  nextCursor: string | null;
  recommendedJobId: string | null;
  recommended: JobPosting | null;
  counts: JobStatusCounts;
};

const EMPTY_COUNTS: JobStatusCounts = {
  new: 0,
  reviewing: 0,
  applied: 0,
  discarded: 0,
  snoozed: 0,
  closed: 0,
};

function parseStatus(raw: string | null): JobStatus {
  const parsed = jobStatusEnum.safeParse(raw ?? "new");
  return parsed.success ? parsed.data : "new";
}

function parseBand(raw: string | null): JobBand | "" {
  if (!raw) return "";
  const parsed = jobBandEnum.safeParse(raw);
  return parsed.success ? parsed.data : "";
}

export function JobsTable() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const band = parseBand(searchParams.get("band"));

  const [items, setItems] = useState<JobPosting[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<JobPosting | null>(null);
  const [recommendedJobId, setRecommendedJobId] = useState<string | null>(null);
  const [counts, setCounts] = useState<JobStatusCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setFilters = useCallback(
    (nextStatus: JobStatus, nextBand: JobBand | "") => {
      const params = new URLSearchParams();
      params.set("status", nextStatus);
      if (nextBand) params.set("band", nextBand);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const loadPage = useCallback(
    async (cursor: string | null, replace: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (replace) {
        setLoading(true);
        setItems([]);
        setNextCursor(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({ status });
      if (band) params.set("band", band);
      if (cursor) params.set("cursor", cursor);

      try {
        const response = await fetch(`/api/jobs?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          toast.error("Could not load jobs");
          return;
        }
        const body = (await response.json()) as JobsPageResponse;
        if (controller.signal.aborted) return;
        setRecommendedJobId(body.recommendedJobId);
        setRecommended(body.recommended);
        setCounts(body.counts ?? EMPTY_COUNTS);
        setNextCursor(body.nextCursor);
        setItems((current) => (replace ? body.items : [...current, ...body.items]));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error("Could not load jobs");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [status, band, toast],
  );

  useEffect(() => {
    void loadPage(null, true);
    return () => abortRef.current?.abort();
  }, [loadPage]);

  const displayItems = useMemo(() => {
    if (!recommended || recommended.status !== status) return items;
    if (band && recommended.band !== band) return items;
    const without = items.filter((item) => item.id !== recommended.id);
    return [recommended, ...without];
  }, [items, recommended, status, band]);

  const showRecommendedBanner = Boolean(recommended && recommended.status !== status);

  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtual = virtualItems.at(-1);
  useEffect(() => {
    if (!lastVirtual || loading || loadingMore || !nextCursor) return;
    if (lastVirtual.index >= displayItems.length - 8) {
      void loadPage(nextCursor, false);
    }
  }, [lastVirtual, loading, loadingMore, nextCursor, displayItems.length, loadPage]);

  async function onIngest() {
    setIngesting(true);
    const result = await runServerAction(() => runIngestNow(), toast, {
      successMessage: "Ingest finished",
    });
    setIngesting(false);
    if (result.success) void loadPage(null, true);
  }

  async function onDiscard(id: string) {
    setRowBusyId(id);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    const result = await runServerAction(() => setJobStatus(id, "discarded"), toast, {
      successMessage: "Discarded",
    });
    setRowBusyId(null);
    if (!result.success) {
      setItems(previous);
      return;
    }
    setCounts((current) => ({
      ...current,
      [status]: Math.max(0, current[status] - 1),
      discarded: current.discarded + (status === "discarded" ? 0 : 1),
    }));
  }

  async function onSnooze(id: string) {
    setRowBusyId(id);
    const previous = items;
    const shouldRemove = status !== "snoozed";
    if (shouldRemove) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
    const result = await runServerAction(() => snoozeJob(id), toast, {
      successMessage: "Snoozed +7 days",
    });
    setRowBusyId(null);
    if (!result.success) {
      setItems(previous);
      return;
    }
    if (shouldRemove) {
      setCounts((current) => ({
        ...current,
        [status]: Math.max(0, current[status] - 1),
        snoozed: current.snoozed + 1,
      }));
    }
    if (!shouldRemove) void loadPage(null, true);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <JobStatusPills
          status={status}
          band={band}
          counts={counts}
          onStatusChange={(next) => setFilters(next, band)}
          onBandChange={(next) => setFilters(status, next)}
        />
        <button
          type="button"
          onClick={() => void onIngest()}
          disabled={ingesting}
          className="border-border text-muted-foreground hover:text-foreground ml-auto rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {ingesting ? "Ingesting…" : "Run ingest now"}
        </button>
      </div>

      {showRecommendedBanner && recommended ? (
        <JobRecommendedBanner job={recommended} />
      ) : null}

      <div
        ref={parentRef}
        className="border-border max-h-[70vh] overflow-auto rounded-lg border"
      >
        <div
          className={cn(
            JOB_QUEUE_GRID,
            "border-border bg-background text-muted-foreground sticky top-0 z-10 hidden border-b px-3 py-2 text-xs font-medium md:grid",
          )}
        >
          <div>Role</div>
          <div>Location</div>
          <div>
            {status === "applied" || status === "snoozed" ? "Follow-up" : "Posted"}
          </div>
          <div>Match</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <p className="text-muted-foreground p-6 text-center text-sm">Loading jobs…</p>
        ) : displayItems.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No jobs in {status}
            {band ? ` · ${band}` : ""}.
          </p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() } satisfies CSSProperties}
          >
            {virtualItems.map((virtualRow) => {
              const job = displayItems[virtualRow.index];
              if (!job) return null;
              return (
                <JobQueueRow
                  key={job.id}
                  job={job}
                  recommended={job.id === recommendedJobId}
                  busy={rowBusyId === job.id}
                  onDiscard={(id) => void onDiscard(id)}
                  onSnooze={(id) => void onSnooze(id)}
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <p className="text-muted-foreground border-border border-t px-3 py-2 text-center text-xs">
            Loading more…
          </p>
        ) : null}
      </div>
    </div>
  );
}
