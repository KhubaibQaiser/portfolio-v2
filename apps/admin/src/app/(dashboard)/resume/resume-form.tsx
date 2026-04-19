"use client";

import { useState } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveResume } from "@/lib/actions";
import type { Database } from "@portfolio/shared/supabase/database.types";
import type { Education, Certification } from "@portfolio/shared/schemas";

type ResumeRow = Database["public"]["Tables"]["resume"]["Row"];

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [defaultSummary, setDefaultSummary] = useState(
    initialData?.default_summary ?? "",
  );
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
      prev.map((row) =>
        row._clientId === clientId ? { ...row, [field]: value } : row,
      ),
    );
  }

  function setCertField(
    clientId: string,
    field: keyof Certification,
    value: string | null,
  ) {
    setCertifications((prev) =>
      prev.map((row) =>
        row._clientId === clientId ? { ...row, [field]: value } : row,
      ),
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
    setMessage("");
    const payload = {
      default_summary: defaultSummary,
      education: education.map(({ _clientId: _a, ...rest }) => rest),
      certifications: certifications.map(({ _clientId: _b, ...rest }) => rest),
      visible_sections: visibleSections,
      is_projects_visible: isProjectsVisible,
    };
    const result = await saveResume(payload);
    setSaving(false);
    setMessage(result.success ? "Saved!" : result.error);
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
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-hidden",
          )}
        />
      </div>

      <div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Education
          </h2>
          <button
            type="button"
            onClick={addEducation}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5",
              "text-sm font-medium hover:bg-muted/50",
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
              className="rounded-lg border border-border/50 bg-muted/20 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Degree</label>
                  <input
                    value={row.degree}
                    onChange={(e) =>
                      setEducationField(row._clientId, "degree", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Year</label>
                  <input
                    value={row.year}
                    onChange={(e) =>
                      setEducationField(row._clientId, "year", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Institution
                  </label>
                  <input
                    value={row.institution}
                    onChange={(e) =>
                      setEducationField(row._clientId, "institution", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {education.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEducation(row._clientId)}
                  className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Certifications
          </h2>
          <button
            type="button"
            onClick={addCertification}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5",
              "text-sm font-medium hover:bg-muted/50",
            )}
          >
            <Plus className="h-4 w-4" />
            Add certification
          </button>
        </div>
        <div className="space-y-4">
          {certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certifications yet.</p>
          ) : (
            certifications.map((row) => (
              <div
                key={row._clientId}
                className="rounded-lg border border-border/50 bg-muted/20 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                    <input
                      value={row.name}
                      onChange={(e) =>
                        setCertField(row._clientId, "name", e.target.value)
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Issuer</label>
                    <input
                      value={row.issuer}
                      onChange={(e) =>
                        setCertField(row._clientId, "issuer", e.target.value)
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCertification(row._clientId)}
                  className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
          Visible resume sections
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Controls the PDF and /resume page (when wired). At least match your PDF template
          expectations.
        </p>
        <div className="flex flex-wrap gap-4">
          {SECTION_OPTIONS.map((s) => (
            <label
              key={s.key}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={visibleSections.includes(s.key)}
                onChange={() => toggleSection(s.key)}
                className="rounded border-border"
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
          className="rounded border-border"
        />
        Projects visible on site (portfolio flag)
      </label>

      {message && (
        <p className={cn("text-sm", message === "Saved!" ? "text-green-600" : "text-red-500")}>
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5",
          "text-sm font-medium text-accent-foreground transition-opacity",
          "hover:opacity-90 disabled:opacity-50",
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save & Publish"}
      </button>
    </div>
  );
}
