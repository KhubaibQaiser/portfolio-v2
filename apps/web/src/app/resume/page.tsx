import type { Metadata } from "next";
import { Download, MapPin, Mail, Globe, ExternalLink } from "lucide-react";
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import {
  ResumePdfDownloadLink,
  ResumeViewTracker,
} from "@/components/analytics/resume-analytics";
import { getResumeData } from "@/lib/resume-data";

export const metadata: Metadata = {
  title: "Resume",
  description: "Senior Software Engineer resume with 11+ years of experience in React, Next.js, TypeScript, AWS, and React Native.",
};

export default async function ResumePage() {
  const resume = await getResumeData();

  return (
    <div className="py-32">
      <ResumeViewTracker />
      <div className="mx-auto max-w-3xl px-(--container-padding)">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h1 font-bold tracking-tight">
              {resume.name}
            </h1>
            <p className="mt-1 text-body-lg font-medium text-accent">
              {resume.title}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/90 dark:text-foreground/85">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 opacity-80" />
                {resume.location}
              </span>
              <a
                href={`mailto:${resume.email}`}
                className="inline-flex items-center gap-1 text-foreground/90 underline-offset-4 transition-colors hover:text-accent dark:text-foreground/85"
              >
                <Mail className="h-3.5 w-3.5 opacity-80" />
                {resume.email}
              </a>
              <TrackedExternalLink
                href={`https://${resume.website}`}
                destination="website"
                location="resume_page"
                className="inline-flex items-center gap-1 text-foreground/90 underline-offset-4 transition-colors hover:text-accent dark:text-foreground/85"
              >
                <Globe className="h-3.5 w-3.5 opacity-80" />
                {resume.website}
              </TrackedExternalLink>
            </div>
          </div>
          <ResumePdfDownloadLink className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-opacity hover:opacity-90">
            <Download className="h-4 w-4" />
            Download PDF
          </ResumePdfDownloadLink>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {resume.socialLinks
            .filter((s) => ["linkedin", "github"].includes(s.platform))
            .map(({ platform, url, label }) => (
              <TrackedExternalLink
                key={platform}
                href={url}
                destination={platform}
                location="resume_page"
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-foreground/88 transition-colors hover:border-accent/40 hover:text-accent dark:text-foreground/80"
              >
                {label} <ExternalLink className="h-3 w-3" />
              </TrackedExternalLink>
            ))}
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-foreground">
            Professional Summary
          </h2>
          <div className="mt-3 h-px bg-border" />
          <p className="mt-4 leading-relaxed text-foreground/92 dark:text-foreground/88">
            {resume.summary}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-foreground">
            Technical Skills
          </h2>
          <div className="mt-3 h-px bg-border" />
          <div className="mt-4 space-y-3">
            {resume.skills.map((group) => (
              <div key={group.category} className="flex gap-2">
                <span className="w-32 shrink-0 text-sm font-semibold text-foreground">
                  {group.category}:
                </span>
                <span className="text-sm text-foreground/88 dark:text-foreground/82">
                  {group.items.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-foreground">
            Professional Experience
          </h2>
          <div className="mt-3 h-px bg-border" />
          <div className="mt-4 space-y-8">
            {resume.experience.map((exp) => (
              <div key={`${exp.company}-${exp.period}`}>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-foreground">{exp.role}</h3>
                  <span className="font-mono text-sm text-foreground/78 dark:text-foreground/72">
                    {exp.period}
                  </span>
                </div>
                <p className="text-accent">{exp.company}</p>
                <p className="text-sm text-foreground/82 dark:text-foreground/75">{exp.location}</p>
                <p className="text-xs text-foreground/70 dark:text-foreground/65">{exp.contractType}</p>
                <ul className="mt-2 space-y-1">
                  {exp.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed text-foreground/90 dark:text-foreground/85"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-foreground/78 dark:text-foreground/70">
                  <strong className="font-semibold text-foreground/88">Tech:</strong>{" "}
                  {exp.tech}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-foreground">
            Education
          </h2>
          <div className="mt-3 h-px bg-border" />
          {resume.education.map((edu) => (
            <div key={edu.institution} className="mt-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{edu.degree}</h3>
                <p className="text-accent">{edu.institution}</p>
              </div>
              <span className="text-sm text-foreground/82 dark:text-foreground/75">{edu.year}</span>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-foreground">
            Certifications
          </h2>
          <div className="mt-3 h-px bg-border" />
          <ul className="mt-4 space-y-1 text-sm text-foreground/90 dark:text-foreground/85">
            {resume.certifications.map((cert) => (
              <li key={cert.name} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-accent" />
                {cert.name}
                {cert.issuer && (
                  <span className="text-xs text-foreground/72 dark:text-foreground/65">
                    ({cert.issuer})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
