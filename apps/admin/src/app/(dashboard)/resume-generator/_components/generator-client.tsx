"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Square } from "lucide-react";
import {
  atsScoreSchema,
  coverLetterSchema,
  resumeGenerationSuccessSchema,
  storedTailoredResumeSchema,
  tailoredResumeSchema,
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
import { JobMetaFields } from "./job-meta-fields";
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
import { GenerationWarnings } from "./generation-warnings";
import type { GenKind, GenerationState, HistoryItem, OptionsState } from "./types";

type Tab = "resume" | "cover_letter";

type Props = {
  initialHistory: HistoryItem[];
  layouts: ResumeLayout[];
  defaultLayoutId: string;
  baseResume: ResumeData | null;
};

type ArtifactContext = {
  generationId: string;
  layoutId: string;
  sourceHash: string;
  guidelineHash: string;
  jobDescription: string;
};

const DEFAULT_OPTS: OptionsState = {
  company: "",
  role: "",
  hiringManager: "",
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
  const [exporting, setExporting] = useState<"resume" | "cover_letter" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [resumeContext, setResumeContext] = useState<ArtifactContext | null>(null);
  const [coverLetterContext, setCoverLetterContext] = useState<ArtifactContext | null>(
    null,
  );
  const [resumeDirty, setResumeDirty] = useState(false);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canGenerate = jd.trim().length >= 20 && !streaming;
  const resumeStale = Boolean(
    resumeContext &&
    (resumeContext.layoutId !== layoutId ||
      resumeContext.jobDescription.trim() !== jd.trim()),
  );
  const resumeIsValid = generation.resume
    ? tailoredResumeSchema.safeParse(generation.resume).success
    : false;

  function recordChanges(resume: TailoredResume | null) {
    if (!resume || !baseResume) {
      setAppliedChanges([]);
      return;
    }
    setAppliedChanges(describeAppliedResumeChanges(baseResume, resume, options.role));
  }

  async function runGenerate(kind: GenKind, opts?: { mustTryToInclude?: string[] }) {
    if (!canGenerate) return;
    setError(null);
    setStreaming(kind);
    const regenerateFromId = activeHistoryId;
    if (
      resumeDirty &&
      (kind === "resume" || kind === "both") &&
      !window.confirm("Replace your unsaved resume edits with a new generation?")
    ) {
      setStreaming(null);
      return;
    }
    setGenerationWarnings([]);

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
          mustTryToInclude: opts?.mustTryToInclude,
          regenerateFromId: regenerateFromId ?? undefined,
          layoutId: layoutId || undefined,
        }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof json.error === "object" &&
          json.error !== null &&
          "message" in json.error &&
          typeof json.error.message === "string"
            ? json.error.message
            : "Generation failed. Please retry.";
        throw new Error(message);
      }
      const parsed = resumeGenerationSuccessSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("The server returned an incomplete generation. Please retry.");
      }
      const context: ArtifactContext = {
        generationId: parsed.data.generationId,
        layoutId: parsed.data.layout.id,
        sourceHash: parsed.data.layout.sourceHash,
        guidelineHash: parsed.data.layout.guidelineHash,
        jobDescription: jd,
      };
      setGeneration((current) => ({
        resume: parsed.data.resume ?? current.resume,
        coverLetter: parsed.data.coverLetter ?? current.coverLetter,
        ats: parsed.data.resume ? null : current.ats,
      }));
      setGenerationWarnings(parsed.data.metadata.warnings);
      setActiveHistoryId(parsed.data.generationId);
      if (parsed.data.resume) {
        setResumeContext(context);
        setResumeDirty(false);
        setAppliedChanges(parsed.data.appliedChanges);
        setPreviewRevision((n) => n + 1);
      }
      if (parsed.data.coverLetter) setCoverLetterContext(context);
      await refreshHistory();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setStreaming(null);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
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
      if (!generation.resume || !resumeContext) return;
      setAtsBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/resume/ats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationId: resumeContext.generationId,
            resume: generation.resume,
            layoutId,
            sourceHash: resumeContext.sourceHash,
            guidelineHash: resumeContext.guidelineHash,
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
    [generation.resume, jd, layoutId, resumeContext],
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
    if (exporting) return;
    if (kind === "resume" && !generation.resume) return;
    if (kind === "cover_letter" && !generation.coverLetter) return;
    setExporting(kind);
    setError(null);

    try {
      const body =
        kind === "resume"
          ? resumeContext
            ? {
                kind,
                generationId: resumeContext.generationId,
                resume: generation.resume,
                layoutId,
                sourceHash: resumeContext.sourceHash,
                guidelineHash: resumeContext.guidelineHash,
              }
            : null
          : {
              kind,
              generationId: coverLetterContext?.generationId,
              coverLetter: generation.coverLetter,
              meta: {
                company: options.company || undefined,
                role: options.role || undefined,
              },
            };
      if (!body || !body.generationId) {
        throw new Error("Regenerate this legacy result before exporting.");
      }

      const res = await fetch("/api/resume/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json: unknown = await res.json().catch(() => null);
        const message =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof json.error === "object" &&
          json.error !== null &&
          "message" in json.error &&
          typeof json.error.message === "string"
            ? json.error.message
            : "Download failed";
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "resume" ? "resume.pdf" : "cover-letter.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error ? downloadError.message : "Download failed",
      );
    } finally {
      setExporting(null);
    }
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
        ? storedTailoredResumeSchema.safeParse(json.row.resume)
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
      setGenerationWarnings([]);
      setJd(json.row.jd_text ?? "");
      setJdSource(json.row.jd_source ?? "paste");
      setOptions({
        company: json.row.company ?? "",
        role: json.row.role ?? "",
        hiringManager: json.row.hiring_manager ?? "",
      });
      if (typeof json.row.layout_id === "string" && json.row.layout_id) {
        setLayoutId(json.row.layout_id);
      }
      const snapshot = json.row.source_snapshot;
      const context =
        snapshot &&
        typeof snapshot.sourceHash === "string" &&
        typeof snapshot.guidelineHash === "string" &&
        typeof json.row.layout_id === "string"
          ? {
              generationId: id,
              layoutId: json.row.layout_id,
              sourceHash: snapshot.sourceHash,
              guidelineHash: snapshot.guidelineHash,
              jobDescription: json.row.jd_text ?? "",
            }
          : null;
      setResumeContext(nextResume ? context : null);
      setCoverLetterContext(cover?.success ? context : null);
      setResumeDirty(false);
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
    <div
      className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]"
      aria-busy={Boolean(streaming)}
    >
      <section className="min-w-0 space-y-4">
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

        <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
          Cover letter details
        </h2>
        <JobMetaFields
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
        </div>

        {error && (
          <p className="text-destructive text-sm" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {resumeStale ? (
          <p className="text-c-card-muted text-sm" role="status">
            The job description or layout changed. Regenerate before ATS or PDF export.
          </p>
        ) : null}
        <GenerationWarnings warnings={generationWarnings} />

        <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
          ATS match
        </h2>
        <AtsPanel
          value={generation.ats}
          busy={atsBusy}
          canRun={Boolean(
            generation.resume && resumeContext && !resumeStale && resumeIsValid,
          )}
          canNudge={Boolean(
            generation.ats && generation.ats.missingKeywords.length > 0 && canGenerate,
          )}
          onRun={() => void runAts(false)}
          onNudge={() => void runAts(true)}
        />

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["resume", "Resume"],
              ["cover_letter", "Cover letter"],
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
                  disabled={
                    Boolean(exporting) || resumeStale || !resumeContext || !resumeIsValid
                  }
                  className={cn(
                    "bg-accent relative flex min-w-13 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
                    "text-accent-foreground font-medium hover:opacity-90 disabled:opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      exporting === "resume" && "invisible",
                    )}
                  >
                    <Download className="h-3 w-3" /> PDF
                  </span>
                  {exporting === "resume" ? (
                    <RefreshCw className="absolute h-3 w-3 animate-spin" />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => void applySummary()}
                  disabled={
                    Boolean(streaming) || resumeStale || !resumeContext || !resumeIsValid
                  }
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
                  disabled={Boolean(exporting) || !coverLetterContext}
                  className={cn(
                    "bg-accent relative flex min-w-13 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
                    "text-accent-foreground font-medium hover:opacity-90 disabled:opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      exporting === "cover_letter" && "invisible",
                    )}
                  >
                    <Download className="h-3 w-3" /> PDF
                  </span>
                  {exporting === "cover_letter" ? (
                    <RefreshCw className="absolute h-3 w-3 animate-spin" />
                  ) : null}
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
                  setResumeDirty(true);
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
                    context={resumeContext}
                    stale={resumeStale}
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
