"use client";

import type { TailoredResume } from "@portfolio/ai/schemas";
import { cn } from "@/lib/utils";

type Props = {
  value: TailoredResume | null;
  streaming?: boolean;
  onChange?: (next: TailoredResume) => void;
};

const textareaCls = cn(
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm",
  "focus:border-accent focus:outline-hidden",
);

export function ResumePreview({ value, streaming, onChange }: Props) {
  if (!value) {
    return (
      <EmptyState
        title="No resume generated yet"
        hint="Paste a JD on the left and click Generate."
      />
    );
  }

  // Streamed partial JSON may omit fields until the model fills them.
  const v = value as Partial<TailoredResume>;
  const summary = v.summary ?? "";
  const keywords = v.keywords ?? [];
  const experiences = v.experiences ?? [];
  const skills = v.skills ?? [];

  const editable = !streaming && Boolean(onChange);

  function update(mutator: (draft: TailoredResume) => void) {
    if (!onChange) return;
    const clone = structuredClone(value) as TailoredResume;
    clone.summary ??= "";
    clone.keywords ??= [];
    clone.experiences ??= [];
    clone.skills ??= [];
    mutator(clone);
    onChange(clone);
  }

  return (
    <div className="space-y-6">
      <Section title="Summary">
        <textarea
          value={summary}
          onChange={(e) => update((d) => (d.summary = e.target.value))}
          rows={4}
          disabled={!editable}
          className={textareaCls}
        />
      </Section>

      <Section title={`Keywords (${keywords.length})`}>
        <p className="flex flex-wrap gap-1.5 text-xs">
          {keywords.map((k) => (
            <span
              key={k}
              className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-muted-foreground"
            >
              {k}
            </span>
          ))}
        </p>
      </Section>

      <Section title="Experience">
        <div className="space-y-4">
          {experiences.map((exp, ei) => (
            <div
              key={`${exp.experienceId ?? "exp"}-${ei}`}
              className="rounded-lg border border-border/60 bg-muted/10 p-3"
            >
              <p className="mb-2 text-xs text-muted-foreground">
                {exp.experienceId ?? "…"} · {(exp.bullets ?? []).length} bullets
              </p>
              <div className="space-y-2">
                {(exp.bullets ?? []).map((b, bi) => (
                  <textarea
                    key={bi}
                    value={b.text ?? ""}
                    onChange={(e) =>
                      update((d) => {
                        d.experiences[ei]!.bullets[bi]!.text = e.target.value;
                      })
                    }
                    rows={2}
                    disabled={!editable}
                    className={textareaCls}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div className="space-y-2">
          {skills.map((g, gi) => (
            <div
              key={`${g.category}-${gi}`}
              className="grid gap-2 sm:grid-cols-[160px_1fr]"
            >
              <input
                value={g.category}
                onChange={(e) =>
                  update((d) => (d.skills[gi]!.category = e.target.value))
                }
                disabled={!editable}
                className={cn(textareaCls, "font-medium")}
              />
              <input
                value={(g.items ?? []).join(", ")}
                onChange={(e) =>
                  update(
                    (d) =>
                      (d.skills[gi]!.items = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)),
                  )
                }
                disabled={!editable}
                className={textareaCls}
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
