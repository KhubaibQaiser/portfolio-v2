"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parsePartialJson } from "ai";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Zap,
} from "lucide-react";
import {
  atsScoreSchema,
  combinedSchema,
  coverLetterSchema,
  tailoredResumeSchema,
  type CoverLetter,
  type TailoredResume,
} from "@portfolio/ai/schemas";
import { cn } from "@/lib/utils";
import { JdInput } from "./jd-input";
import { OptionsForm } from "./options-form";
import { ResumePreview } from "./resume-preview";
import { CoverLetterPreview } from "./cover-letter-preview";
import { AtsPanel } from "./ats-panel";
import { HistoryDrawer } from "./history-drawer";
import { PolishChecklist } from "./polish-checklist";
import type {
  GenKind,
  GenerationState,
  HistoryItem,
  OptionsState,
} from "./types";

type Tab = "resume" | "cover_letter" | "ats";

type Props = {
  initialHistory: HistoryItem[];
  dailyCap: number;
};

const DEFAULT_OPTS: OptionsState = {
  company: "",
  role: "",
  hiringManager: "",
  tone: "",
  length: "",
  language: "en",
};

export function GeneratorClient({ initialHistory }: Props) {
  const [jd, setJd] = useState("");
  const [jdSource, setJdSource] = useState<"paste" | "pdf">("paste");
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTS);
  const [tab, setTab] = useState<Tab>("resume");
  const [generation, setGeneration] = useState<GenerationState>({
    resume: null,
    coverLetter: null,
    ats: null,
  });
  const [streaming, setStreaming] = useState<GenKind | null>(null);
  const [atsBusy, setAtsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canGenerate = jd.trim().length >= 20 && !streaming;

  async function runGenerate(kind: GenKind, opts?: { mode?: "quality" | "fast"; mustTryToInclude?: string[] }) {
    if (!canGenerate) return;
    setError(null);
    setStreaming(kind);
    const regenerateFromId = activeHistoryId;
    setActiveHistoryId(null);

    if (kind === "resume" || kind === "both") {
      setGeneration((g) => ({ ...g, resume: null, ats: null }));
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
        }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = await parsePartialJson(buffer);
        if (parsed.value && typeof parsed.value === "object") {
          applyPartial(kind, parsed.value as Record<string, unknown>);
        }
      }

      const final = await parsePartialJson(buffer);
      if (final.value) {
        applyPartial(kind, final.value as Record<string, unknown>);
      }

      if (kind === "resume" || kind === "both") void refreshHistory();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setStreaming(null);
      abortRef.current = null;
    }
  }

  function applyPartial(kind: GenKind, value: Record<string, unknown>) {
    if (kind === "both") {
      const res = combinedSchema.partial().safeParse(value);
      if (res.success) {
        setGeneration((g) => ({
          ...g,
          resume: (res.data.resume as TailoredResume) ?? g.resume,
          coverLetter:
            (res.data.coverLetter as CoverLetter) ?? g.coverLetter,
        }));
      }
      return;
    }

    if (kind === "resume") {
      const res = tailoredResumeSchema.partial().safeParse(value);
      if (res.success) {
        setGeneration((g) => ({
          ...g,
          resume: res.data as TailoredResume,
        }));
      }
      return;
    }

    const res = coverLetterSchema.partial().safeParse(value);
    if (res.success) {
      setGeneration((g) => ({ ...g, coverLetter: res.data as CoverLetter }));
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
    [generation.resume, jd],
  );

  function resumeToPlainText(r: TailoredResume): string {
    const lines: string[] = [];
    if (r.summary) lines.push(r.summary, "");
    if (r.keywords?.length) lines.push(`Keywords: ${r.keywords.join(", ")}`, "");
    for (const exp of r.experiences ?? []) {
      lines.push(`[${exp.experienceId}]`);
      for (const b of exp.bullets ?? []) lines.push(`- ${b.text}`);
      lines.push("");
    }
    if (r.skills?.length) {
      lines.push("Skills:");
      for (const s of r.skills) {
        lines.push(`- ${s.category}: ${s.items.join(", ")}`);
      }
    }
    return lines.join("\n").trim();
  }

  function coverLetterToPlainText(c: CoverLetter): string {
    const parts: string[] = [];
    if (c.greeting) parts.push(c.greeting);
    parts.push(...(c.body ?? []));
    if (c.closing) parts.push(c.closing);
    if (c.signOff) parts.push(c.signOff);
    return parts.join("\n\n").trim();
  }

  async function copyTo(kind: "resume" | "cover_letter") {
    const text =
      kind === "resume"
        ? generation.resume
          ? resumeToPlainText(generation.resume)
          : ""
        : generation.coverLetter
          ? coverLetterToPlainText(generation.coverLetter)
          : "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Copy to clipboard failed");
    }
  }

  async function download(kind: "resume" | "cover_letter") {
    if (kind === "resume" && !generation.resume) return;
    if (kind === "cover_letter" && !generation.coverLetter) return;

    const body =
      kind === "resume"
        ? { kind, resume: generation.resume }
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
    a.download =
      kind === "resume" ? "resume.pdf" : "cover-letter.pdf";
    a.click();
    URL.revokeObjectURL(url);
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
      const ats = json.row.ats
        ? atsScoreSchema.safeParse(json.row.ats)
        : null;

      setGeneration({
        resume: resume?.success ? resume.data : null,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(260px,380px)_minmax(0,1fr)_minmax(240px,280px)]">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
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

        <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-accent">
          Options
        </h2>
        <OptionsForm
          value={options}
          onChange={setOptions}
          disabled={Boolean(streaming)}
        />

        <div className="flex flex-wrap gap-2 pt-2">
          <GenButton
            label="Resume"
            onClick={() => runGenerate("resume")}
            streaming={streaming === "resume"}
            disabled={!canGenerate}
          />
          <GenButton
            label="Cover letter"
            onClick={() => runGenerate("cover_letter")}
            streaming={streaming === "cover_letter"}
            disabled={!canGenerate}
          />
          <GenButton
            label="Both"
            onClick={() => runGenerate("both")}
            streaming={streaming === "both"}
            disabled={!canGenerate}
            primary
          />
          <button
            type="button"
            onClick={() => runGenerate("resume", { mode: "fast" })}
            disabled={!canGenerate}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5",
              "text-sm font-medium hover:bg-muted/50 disabled:opacity-50",
            )}
            title="Groq Scout, fastest, lower quality"
          >
            <Zap className="h-3.5 w-3.5" /> Fast draft
          </button>
          {streaming && (
            <button
              type="button"
              onClick={stop}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5",
                "text-sm font-medium text-destructive hover:bg-destructive/10",
              )}
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
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
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {tab === "resume" && generation.resume && (
              <>
                <button
                  type="button"
                  onClick={() => runGenerate("resume")}
                  disabled={!canGenerate}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs",
                    "hover:bg-muted disabled:opacity-50",
                  )}
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <CopyButton onClick={() => void copyTo("resume")} />
                <button
                  type="button"
                  onClick={() => download("resume")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs",
                    "font-medium text-accent-foreground hover:opacity-90",
                  )}
                >
                  <Download className="h-3 w-3" /> PDF
                </button>
              </>
            )}
            {tab === "cover_letter" && generation.coverLetter && (
              <>
                <button
                  type="button"
                  onClick={() => runGenerate("cover_letter")}
                  disabled={!canGenerate}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs",
                    "hover:bg-muted disabled:opacity-50",
                  )}
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <CopyButton onClick={() => void copyTo("cover_letter")} />
                <button
                  type="button"
                  onClick={() => download("cover_letter")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs",
                    "font-medium text-accent-foreground hover:opacity-90",
                  )}
                >
                  <Download className="h-3 w-3" /> PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
          {tab === "resume" && (
            <div className="space-y-4">
              <ResumePreview
                value={generation.resume}
                streaming={streaming === "resume" || streaming === "both"}
                onChange={(next) =>
                  setGeneration((g) => ({ ...g, resume: next }))
                }
              />
              {generation.resume && !streaming && (
                <PolishChecklist kind="resume" />
              )}
            </div>
          )}
          {tab === "cover_letter" && (
            <div className="space-y-4">
              <CoverLetterPreview
                value={generation.coverLetter}
                streaming={
                  streaming === "cover_letter" || streaming === "both"
                }
                onChange={(next) =>
                  setGeneration((g) => ({ ...g, coverLetter: next }))
                }
              />
              {generation.coverLetter && !streaming && (
                <PolishChecklist kind="cover_letter" />
              )}
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
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

function CopyButton({ onClick }: { onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs",
        "hover:bg-muted",
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

function GenButton({
  label,
  onClick,
  streaming,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  streaming?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity",
        primary
          ? "bg-accent text-accent-foreground hover:opacity-90"
          : "border border-border bg-muted/30 hover:bg-muted/50",
        "disabled:opacity-50",
      )}
    >
      {streaming ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
