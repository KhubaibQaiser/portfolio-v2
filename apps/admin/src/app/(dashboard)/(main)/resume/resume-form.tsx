"use client";

import { useState } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveResume } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type {
  Resume as ResumeRow,
  Education,
  Certification,
} from "@portfolio/shared/schemas";

const SECTION_OPTIONS = [
  { key: "experience", label: "Work experience" },
  { key: "skills", label: "Technical skills" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
] as const;

type EducationDraft = Education & { _clientId: string };
type CertificationDraft = Certification & { _clientId: string };

function id(): string {
  return crypto.randomUUID();
}

function parseEducation(raw: unknown): EducationDraft[] {
  const list = (raw as Education[] | null) ?? [];
  if (list.length === 0) {
    return [
      {
        _clientId: id(),
        degree: "",
        institution: "",
        year: "",
        url: null,
      },
    ];
  }
  return list.map((e) => ({
    ...e,
    url: e.url ?? null,
    _clientId: id(),
  }));
}

function parseCertifications(raw: unknown): CertificationDraft[] {
  const list = (raw as Certification[] | null) ?? [];
  return list.map((c) => ({
    ...c,
    url: c.url ?? null,
    _clientId: id(),
  }));
}

function parseVisibleSections(raw: unknown): string[] {
  const v = raw as string[] | null;
  if (Array.isArray(v) && v.length > 0) return [...v];
  return SECTION_OPTIONS.map((s) => s.key);
}

type ResumeFormProps = {
  initialData: ResumeRow | null;
};

export function ResumeForm({ initialData }: ResumeFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [defaultSummary, setDefaultSummary] = useState(
    initialData?.default_summary ?? "",
  );
  const [voiceSample, setVoiceSample] = useState(initialData?.voice_sample ?? "");
  const [education, setEducation] = useState<EducationDraft[]>(() =>
    parseEducation(initialData?.education),
  );
  const [certifications, setCertifications] = useState<CertificationDraft[]>(() =>
    parseCertifications(initialData?.certifications),
  );
  const [visibleSections, setVisibleSections] = useState<string[]>(() =>
    parseVisibleSections(initialData?.visible_sections),
  );
  const [isProjectsVisible, setIsProjectsVisible] = useState(
    initialData?.is_projects_visible ?? true,
  );

  function setEducationField(
    clientId: string,
    field: keyof Education,
    value: string | null,
  ) {
    setEducation((prev) =>
      prev.map((row) => (row._clientId === clientId ? { ...row, [field]: value } : row)),
    );
  }

  function setCertField(
    clientId: string,
    field: keyof Certification,
    value: string | null,
  ) {
    setCertifications((prev) =>
      prev.map((row) => (row._clientId === clientId ? { ...row, [field]: value } : row)),
    );
  }

  function addEducation() {
    setEducation((prev) => [
      ...prev,
      {
        _clientId: id(),
        degree: "",
        institution: "",
        year: "",
        url: null,
      },
    ]);
  }

  function removeEducation(clientId: string) {
    setEducation((prev) => {
      const next = prev.filter((r) => r._clientId !== clientId);
      return next.length > 0 ? next : prev;
    });
  }

  function addCertification() {
    setCertifications((prev) => [
      ...prev,
      {
        _clientId: id(),
        name: "",
        issuer: "",
        url: null,
      },
    ]);
  }

  function removeCertification(clientId: string) {
    setCertifications((prev) => prev.filter((r) => r._clientId !== clientId));
  }

  function toggleSection(key: string) {
    setVisibleSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      default_summary: defaultSummary,
      education: education.map(({ _clientId: _a, ...rest }) => rest),
      certifications: certifications.map(({ _clientId: _b, ...rest }) => rest),
      visible_sections: visibleSections,
      is_projects_visible: isProjectsVisible,
      voice_sample: voiceSample.trim() === "" ? null : voiceSample,
    };
    await runServerAction(() => saveResume(payload), toast);
    setSaving(false);
  }

  return (
    <div className="mt-8 space-y-8">
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Professional summary (PDF &amp; site)
        </label>
        <textarea
          value={defaultSummary}
          onChange={(e) => setDefaultSummary(e.target.value)}
          rows={8}
          className={cn(
            "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
            "focus:border-accent text-sm focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Voice sample (Resume AI only)
        </label>
        <p className="text-muted-foreground mb-2 text-xs">
          ~150–300 words in your own voice. The generator uses this as a few-shot anchor
          so tailored resumes and cover letters sound like you, not like an AI.
        </p>
        <textarea
          value={voiceSample}
          onChange={(e) => setVoiceSample(e.target.value)}
          rows={8}
          maxLength={3000}
          placeholder="Paste a paragraph or two you've written in your own voice — a blog intro, a cover letter you liked, etc."
          className={cn(
            "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
            "focus:border-accent text-sm focus:outline-hidden",
          )}
        />
        <p className="text-muted-foreground mt-1 text-xs">{voiceSample.length}/3000</p>
      </div>

      <div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
            Education
          </h2>
          <button
            type="button"
            onClick={addEducation}
            className={cn(
              "border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-1.5",
              "hover:bg-muted/50 text-sm font-medium",
            )}
          >
            <Plus className="h-4 w-4" />
            Add entry
          </button>
        </div>
        <div className="space-y-4">
          {education.map((row) => (
            <div
              key={row._clientId}
              className="border-border/50 bg-muted/20 rounded-lg border p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Degree
                  </label>
                  <input
                    value={row.degree}
                    onChange={(e) =>
                      setEducationField(row._clientId, "degree", e.target.value)
                    }
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">Year</label>
                  <input
                    value={row.year}
                    onChange={(e) =>
                      setEducationField(row._clientId, "year", e.target.value)
                    }
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Institution
                  </label>
                  <input
                    value={row.institution}
                    onChange={(e) =>
                      setEducationField(row._clientId, "institution", e.target.value)
                    }
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground mb-1 block text-xs">
                    URL (optional)
                  </label>
                  <input
                    value={row.url ?? ""}
                    onChange={(e) =>
                      setEducationField(
                        row._clientId,
                        "url",
                        e.target.value.trim() === "" ? null : e.target.value,
                      )
                    }
                    placeholder="https://…"
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {education.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEducation(row._clientId)}
                  className="text-muted-foreground hover:text-destructive mt-3 flex items-center gap-1 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
            Certifications
          </h2>
          <button
            type="button"
            onClick={addCertification}
            className={cn(
              "border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-1.5",
              "hover:bg-muted/50 text-sm font-medium",
            )}
          >
            <Plus className="h-4 w-4" />
            Add certification
          </button>
        </div>
        <div className="space-y-4">
          {certifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No certifications yet.</p>
          ) : (
            certifications.map((row) => (
              <div
                key={row._clientId}
                className="border-border/50 bg-muted/20 rounded-lg border p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-muted-foreground mb-1 block text-xs">
                      Name
                    </label>
                    <input
                      value={row.name}
                      onChange={(e) =>
                        setCertField(row._clientId, "name", e.target.value)
                      }
                      className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs">
                      Issuer
                    </label>
                    <input
                      value={row.issuer}
                      onChange={(e) =>
                        setCertField(row._clientId, "issuer", e.target.value)
                      }
                      className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs">
                      URL (optional)
                    </label>
                    <input
                      value={row.url ?? ""}
                      onChange={(e) =>
                        setCertField(
                          row._clientId,
                          "url",
                          e.target.value.trim() === "" ? null : e.target.value,
                        )
                      }
                      className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCertification(row._clientId)}
                  className="text-muted-foreground hover:text-destructive mt-3 flex items-center gap-1 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-accent mb-3 text-sm font-semibold tracking-wider uppercase">
          Visible resume sections
        </h2>
        <p className="text-muted-foreground mb-3 text-xs">
          Controls the PDF and /resume page (when wired). At least match your PDF template
          expectations.
        </p>
        <div className="flex flex-wrap gap-4">
          {SECTION_OPTIONS.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleSections.includes(s.key)}
                onChange={() => toggleSection(s.key)}
                className="border-border rounded"
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isProjectsVisible}
          onChange={(e) => setIsProjectsVisible(e.target.checked)}
          className="border-border rounded"
        />
        Projects visible on site (portfolio flag)
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "bg-accent flex items-center gap-2 rounded-lg px-5 py-2.5",
          "text-accent-foreground text-sm font-medium transition-opacity",
          "hover:opacity-90 disabled:opacity-50",
        )}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "Saving..." : "Save & Publish"}
      </button>
    </div>
  );
}
