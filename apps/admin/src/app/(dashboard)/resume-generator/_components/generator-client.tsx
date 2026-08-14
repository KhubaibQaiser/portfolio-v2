"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parsePartialJson } from "ai";
import { Download, RefreshCw, Square, Zap } from "lucide-react";
import {
  atsScoreSchema,
  combinedSchema,
  coverLetterSchema,
  tailoredResumeSchema,
  type CoverLetter,
  type TailoredResume,
} from "@portfolio/ai/schemas";
import type { ResumeLayout } from "@portfolio/shared/schemas";
import type { ResumeData } from "@portfolio/shared/resume-data";
import { describeAppliedResumeChanges } from "@portfolio/shared/resume-changes";
import { cn } from "@/lib/utils";
import { applyTailoredSummary } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { JdInput } from "./jd-input";
import { OptionsForm } from "./options-form";
import { ResumePreview } from "./resume-preview";
import { CoverLetterPreview } from "./cover-letter-preview";
import { AtsPanel } from "./ats-panel";
import { HistoryDrawer } from "./history-drawer";
import { PolishChecklist } from "./polish-checklist";
import { LayoutPicker } from "./layout-picker";
import { AppliedChangesList } from "./applied-changes-list";
import { ResumePdfPreview } from "./resume-pdf-preview";
import { GenButton } from "./gen-button";
import { CopyButton } from "./copy-button";
import type { GenKind, GenerationState, HistoryItem, OptionsState } from "./types";

type Tab = "resume" | "cover_letter" | "ats";

type Props = {
  initialHistory: HistoryItem[];
  layouts: ResumeLayout[];
  defaultLayoutId: string;
  baseResume: ResumeData | null;
};

const DEFAULT_OPTS: OptionsState = {
  company: "",
  role: "",
  hiringManager: "",
  tone: "",
  length: "",
  language: "en",
};

export function GeneratorClient({
  initialHistory,
  layouts,
  defaultLayoutId,
  baseResume,
}: Props) {
  const toast = useToast();
  const [jd, setJd] = useState("");
  const [jdSource, setJdSource] = useState<"paste" | "pdf">("paste");
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTS);
  const [layoutId, setLayoutId] = useState(defaultLayoutId);
  const [tab, setTab] = useState<Tab>("resume");
  const [generation, setGeneration] = useState<GenerationState>({
    resume: null,
    coverLetter: null,
    ats: null,
  });
  const [appliedChanges, setAppliedChanges] = useState<string[]>([]);
  const [streaming, setStreaming] = useState<GenKind | null>(null);
  const [atsBusy, setAtsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canGenerate = jd.trim().length >= 20 && !streaming;

  function recordChanges(resume: TailoredResume | null) {
    if (!resume || !baseResume) {
      setAppliedChanges([]);
      return;
    }
    setAppliedChanges(describeAppliedResumeChanges(baseResume, resume, options.role));
  }

  async function runGenerate(
    kind: GenKind,
    opts?: { mode?: "quality" | "fast"; mustTryToInclude?: string[] },
  ) {
    if (!canGenerate) return;
    setError(null);
    setStreaming(kind);
    const regenerateFromId = activeHistoryId;
    setActiveHistoryId(null);

    if (kind === "resume" || kind === "both") {
      setGeneration((g) => ({ ...g, resume: null, ats: null }));
      setAppliedChanges([]);
    }
    if (kind === "cover_letter" || kind === "both") {
      setGeneration((g) => ({ ...g, coverLetter: null }));
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          jobDescription: jd,
          jdSource,
          company: options.company || undefined,
          role: options.role || undefined,
          hiringManager: options.hiringManager || undefined,
          tone: options.tone || undefined,
          length: options.length || undefined,
          language: options.language,
          model: opts?.mode ?? "quality",
          mustTryToInclude: opts?.mustTryToInclude,
          regenerateFromId: regenerateFromId ?? undefined,
          layoutId: layoutId || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastResume: TailoredResume | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = await parsePartialJson(buffer);
        if (parsed.value && typeof parsed.value === "object") {
          lastResume = applyPartial(kind, parsed.value as Record<string, unknown>);
        }
      }

      const final = await parsePartialJson(buffer);
      if (final.value) {
        lastResume = applyPartial(kind, final.value as Record<string, unknown>);
      }

      if (kind === "resume" || kind === "both") {
        recordChanges(lastResume);
        setPreviewRevision((n) => n + 1);
        void refreshHistory();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setStreaming(null);
      abortRef.current = null;
    }
  }

  function applyPartial(
    kind: GenKind,
    value: Record<string, unknown>,
  ): TailoredResume | null {
    if (kind === "both") {
      const res = combinedSchema.partial().safeParse(value);
      if (res.success) {
        setGeneration((g) => ({
          ...g,
          resume: (res.data.resume as TailoredResume) ?? g.resume,
          coverLetter: (res.data.coverLetter as CoverLetter) ?? g.coverLetter,
        }));
        return (res.data.resume as TailoredResume) ?? null;
      }
      return null;
    }

    if (kind === "resume") {
      const res = tailoredResumeSchema.partial().safeParse(value);
      if (res.success) {
        const next = res.data as TailoredResume;
        setGeneration((g) => ({ ...g, resume: next }));
        return next;
      }
      return null;
    }

    const res = coverLetterSchema.partial().safeParse(value);
    if (res.success) {
      setGeneration((g) => ({ ...g, coverLetter: res.data as CoverLetter }));
    }
    return null;
  }

  function stop() {
    abortRef.current?.abort();
  }

  function startOver() {
    stop();
    setGeneration({ resume: null, coverLetter: null, ats: null });
    setAppliedChanges([]);
    setActiveHistoryId(null);
    setError(null);
    setPreviewRevision(0);
  }

  async function refreshHistory() {
    try {
      const res = await fetch("/api/resume/history", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items: HistoryItem[] };
      if (json.items) setHistory(json.items);
    } catch {
      // silent
    }
  }

  const runAts = useCallback(
    async (nudge = false) => {
      if (!generation.resume) return;
      setAtsBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/resume/ats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume: generation.resume,
            jobDescription: jd,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "ATS failed");
        const parsed = atsScoreSchema.safeParse(json.ats);
        if (!parsed.success) throw new Error("Invalid ATS response");
        setGeneration((g) => ({ ...g, ats: parsed.data }));

        if (nudge && parsed.data.missingKeywords.length > 0) {
          await runGenerate("resume", {
            mustTryToInclude: parsed.data.missingKeywords.slice(0, 10),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "ATS failed");
      } finally {
        setAtsBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generation.resume, jd, layoutId],
  );

  async function copyTo(kind: "resume" | "cover_letter") {
    const payload = kind === "resume" ? generation.resume : generation.coverLetter;
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      setError("Copy to clipboard failed");
    }
  }

  async function download(kind: "resume" | "cover_letter") {
    if (kind === "resume" && !generation.resume) return;
    if (kind === "cover_letter" && !generation.coverLetter) return;

    const body =
      kind === "resume"
        ? { kind, resume: generation.resume, layoutId }
        : {
            kind,
            coverLetter: generation.coverLetter,
            meta: {
              company: options.company || undefined,
              role: options.role || undefined,
            },
          };

    const res = await fetch("/api/resume/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.error ?? "Download failed");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "resume" ? "resume.pdf" : "cover-letter.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function applySummary() {
    if (!generation.resume?.summary) return;
    if (
      !window.confirm(
        "Replace the CMS professional summary with this tailored summary? Experience rows will not change.",
      )
    ) {
      return;
    }
    await runServerAction(() => applyTailoredSummary(generation.resume!.summary), toast, {
      successMessage: "CMS summary updated",
    });
  }

  async function loadHistory(id: string) {
    setActiveHistoryId(id);
    try {
      const res = await fetch(`/api/resume/history/${id}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");

      const resume = json.row.resume
        ? tailoredResumeSchema.safeParse(json.row.resume)
        : null;
      const cover = json.row.cover_letter
        ? coverLetterSchema.safeParse(json.row.cover_letter)
        : null;
      const ats = json.row.ats ? atsScoreSchema.safeParse(json.row.ats) : null;

      const nextResume = resume?.success ? resume.data : null;
      setGeneration({
        resume: nextResume,
        coverLetter: cover?.success ? cover.data : null,
        ats: ats?.success ? ats.data : null,
      });
      setJd(json.row.jd_text ?? "");
      setJdSource(json.row.jd_source ?? "paste");
      setOptions({
        company: json.row.company ?? "",
        role: json.row.role ?? "",
        hiringManager: json.row.hiring_manager ?? "",
        tone: json.row.tone ?? "",
        length: json.row.length ?? "",
        language: json.row.language ?? "en",
      });
      if (typeof json.row.layout_id === "string" && json.row.layout_id) {
        setLayoutId(json.row.layout_id);
      }
      if (
        Array.isArray(json.row.applied_changes) &&
        json.row.applied_changes.length > 0
      ) {
        setAppliedChanges(json.row.applied_changes as string[]);
      } else {
        recordChanges(nextResume);
      }
      setPreviewRevision((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(260px,380px)_minmax(0,1fr)_minmax(240px,280px)]">
      <section className="space-y-4">
        <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
          Layout
        </h2>
        <LayoutPicker
          layouts={layouts}
          value={layoutId}
          onChange={setLayoutId}
          disabled={Boolean(streaming)}
        />

        <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
          Job description
        </h2>
        <JdInput
          value={jd}
          source={jdSource}
          onChange={(v, s) => {
            setJd(v);
            setJdSource(s);
          }}
          disabled={Boolean(streaming)}
        />

        <h2 className="text-accent mt-4 text-sm font-semibold tracking-wider uppercase">
          Options
        </h2>
        <OptionsForm
          value={options}
          onChange={setOptions}
          disabled={Boolean(streaming)}
        />

        <div className="flex flex-wrap gap-2 pt-2">
          <GenButton
            label="Tailor resume"
            onClick={() => runGenerate("resume")}
            streaming={streaming === "resume"}
            disabled={!canGenerate}
            primary
          />
          <GenButton
            label="Cover letter"
            onClick={() => runGenerate("cover_letter")}
            streaming={streaming === "cover_letter"}
            disabled={!canGenerate}
          />
          <button
            type="button"
            onClick={() => runGenerate("resume", { mode: "fast" })}
            disabled={!canGenerate}
            className={cn(
              "border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-1.5",
              "hover:bg-muted/50 text-sm font-medium disabled:opacity-50",
            )}
            title="Faster, lower quality draft"
          >
            <Zap className="h-3.5 w-3.5" /> Fast draft
          </button>
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className={cn(
                "border-destructive/40 bg-destructive/5 flex items-center gap-2 rounded-lg border px-3 py-1.5",
                "text-destructive hover:bg-destructive/10 text-sm font-medium",
              )}
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={startOver}
            disabled={Boolean(streaming)}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline disabled:opacity-50"
          >
            Start over
          </button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </section>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["resume", "Resume"],
              ["cover_letter", "Cover letter"],
              ["ats", "ATS match"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === key
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap gap-2">
            {tab === "resume" && generation.resume ? (
              <>
                <button
                  type="button"
                  onClick={() => runGenerate("resume")}
                  disabled={!canGenerate}
                  className={cn(
                    "border-border flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
                    "hover:bg-muted disabled:opacity-50",
                  )}
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <CopyButton onClick={() => void copyTo("resume")} />
                <button
                  type="button"
                  onClick={() => void download("resume")}
                  className={cn(
                    "bg-accent flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
                    "text-accent-foreground font-medium hover:opacity-90",
                  )}
                >
                  <Download className="h-3 w-3" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => void applySummary()}
                  disabled={Boolean(streaming)}
                  className="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-xs disabled:opacity-50"
                >
                  Apply summary to CMS
                </button>
              </>
            ) : null}
            {tab === "cover_letter" && generation.coverLetter ? (
              <>
                <button
                  type="button"
                  onClick={() => runGenerate("cover_letter")}
                  disabled={!canGenerate}
                  className={cn(
                    "border-border flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
                    "hover:bg-muted disabled:opacity-50",
                  )}
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <CopyButton onClick={() => void copyTo("cover_letter")} />
                <button
                  type="button"
                  onClick={() => void download("cover_letter")}
                  className={cn(
                    "bg-accent flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
                    "text-accent-foreground font-medium hover:opacity-90",
                  )}
                >
                  <Download className="h-3 w-3" /> PDF
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="border-border/60 bg-background/50 rounded-xl border p-4">
          {tab === "resume" && (
            <div className="space-y-4">
              <AppliedChangesList changes={appliedChanges} />
              <ResumePreview
                value={generation.resume}
                streaming={streaming === "resume" || streaming === "both"}
                onChange={(next) => {
                  setGeneration((g) => ({ ...g, resume: next }));
                  recordChanges(next);
                }}
              />
              {generation.resume && !streaming ? (
                <>
                  <PolishChecklist kind="resume" />
                  <ResumePdfPreview
                    resume={generation.resume}
                    layoutId={layoutId}
                    revision={previewRevision}
                  />
                </>
              ) : null}
            </div>
          )}
          {tab === "cover_letter" && (
            <div className="space-y-4">
              <CoverLetterPreview
                value={generation.coverLetter}
                streaming={streaming === "cover_letter" || streaming === "both"}
                onChange={(next) => setGeneration((g) => ({ ...g, coverLetter: next }))}
              />
              {generation.coverLetter && !streaming ? (
                <PolishChecklist kind="cover_letter" />
              ) : null}
            </div>
          )}
          {tab === "ats" && (
            <AtsPanel
              value={generation.ats}
              busy={atsBusy}
              canRun={Boolean(generation.resume)}
              canNudge={Boolean(
                generation.ats &&
                generation.ats.missingKeywords.length > 0 &&
                canGenerate,
              )}
              onRun={() => void runAts(false)}
              onNudge={() => void runAts(true)}
            />
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
          History
        </h2>
        <HistoryDrawer
          items={history}
          activeId={activeHistoryId}
          onSelect={(id) => void loadHistory(id)}
        />
      </aside>
    </div>
  );
}
