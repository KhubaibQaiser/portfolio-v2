import type { Metadata, ResolvingMetadata } from "next";
import { Download, MapPin, Mail, Globe, ExternalLink } from "lucide-react";
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import {
  ResumePdfDownloadLink,
  ResumeViewTracker,
} from "@/components/analytics/resume-analytics";
import { getResumeData } from "@/lib/resume-data";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(
  _props: object,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return buildPageMetadata(parent, {
    title: "Resume",
    description:
      "Senior Software Engineer resume with 11+ years of experience in React, Next.js, TypeScript, AWS, and React Native.",
    path: "/resume",
  });
}

export const revalidate = 10;

export default async function ResumePage() {
  const resume = await getResumeData();

  return (
    <div className="py-32">
      <ResumeViewTracker />
      <div className="mx-auto max-w-3xl px-(--container-padding)">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h1 font-bold tracking-tight">{resume.name}</h1>
            <p className="text-body-lg text-accent mt-1 font-medium">{resume.title}</p>
            <div className="text-foreground/90 dark:text-foreground/85 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 opacity-80" />
                {resume.location}
              </span>
              <a
                href={`mailto:${resume.email}`}
                className="text-foreground/90 hover:text-accent dark:text-foreground/85 inline-flex items-center gap-1 underline-offset-4 transition-colors"
              >
                <Mail className="h-3.5 w-3.5 opacity-80" />
                {resume.email}
              </a>
              <TrackedExternalLink
                href={`https://${resume.website}`}
                destination="website"
                location="resume_page"
                className="text-foreground/90 hover:text-accent dark:text-foreground/85 inline-flex items-center gap-1 underline-offset-4 transition-colors"
              >
                <Globe className="h-3.5 w-3.5 opacity-80" />
                {resume.website}
              </TrackedExternalLink>
            </div>
          </div>
          <ResumePdfDownloadLink className="bg-accent text-accent-foreground flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90">
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
                className="border-border text-foreground/88 hover:border-accent/40 hover:text-accent dark:text-foreground/80 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors"
              >
                {label} <ExternalLink className="h-3 w-3" />
              </TrackedExternalLink>
            ))}
        </div>

        <section className="mt-10">
          <h2 className="text-foreground text-lg font-semibold tracking-wider uppercase">
            Professional Summary
          </h2>
          <div className="bg-border mt-3 h-px" />
          <p className="text-foreground/92 dark:text-foreground/88 mt-4 leading-relaxed">
            {resume.summary}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-foreground text-lg font-semibold tracking-wider uppercase">
            Professional Experience
          </h2>
          <div className="bg-border mt-3 h-px" />
          <div className="mt-4 space-y-8">
            {resume.experience.map((exp) => (
              <div key={`${exp.company}-${exp.period}`}>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-foreground font-semibold">{exp.role}</h3>
                  <span className="text-foreground/78 dark:text-foreground/72 font-mono text-sm">
                    {exp.period}
                  </span>
                </div>
                <p className="text-accent">{exp.company}</p>
                <p className="text-foreground/82 dark:text-foreground/75 text-sm">
                  {exp.location}
                </p>
                <p className="text-foreground/70 dark:text-foreground/65 text-xs">
                  {exp.contractType}
                </p>
                <ul className="mt-2 space-y-1">
                  {exp.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="text-foreground/90 dark:text-foreground/85 flex gap-2 text-sm leading-relaxed"
                    >
                      <span className="bg-accent mt-2 h-1 w-1 shrink-0 rounded-full" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="text-foreground/78 dark:text-foreground/70 mt-2 text-xs">
                  <strong className="text-foreground/88 font-semibold">Tech:</strong>{" "}
                  {exp.tech}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-foreground text-lg font-semibold tracking-wider uppercase">
            Education
          </h2>
          <div className="bg-border mt-3 h-px" />
          {resume.education.map((edu) => (
            <div key={edu.institution} className="mt-4 flex items-start justify-between">
              <div>
                <h3 className="text-foreground font-semibold">{edu.degree}</h3>
                <p className="text-accent">{edu.institution}</p>
              </div>
              <span className="text-foreground/82 dark:text-foreground/75 text-sm">
                {edu.year}
              </span>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-foreground text-lg font-semibold tracking-wider uppercase">
            Certifications
          </h2>
          <div className="bg-border mt-3 h-px" />
          <ul className="text-foreground/90 dark:text-foreground/85 mt-4 space-y-1 text-sm">
            {resume.certifications.map((cert) => (
              <li
                key={cert.name}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
              >
                <span className="bg-accent h-1 w-1 shrink-0 rounded-full" />
                {cert.name}
                {cert.issuer && (
                  <span className="text-foreground/72 dark:text-foreground/65 text-xs">
                    ({cert.issuer})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-foreground text-lg font-semibold tracking-wider uppercase">
            Technical Skills
          </h2>
          <div className="bg-border mt-3 h-px" />
          <div className="mt-4 space-y-3">
            {resume.skills.map((group) => (
              <div key={group.category} className="flex gap-2">
                <span className="text-foreground w-32 shrink-0 text-sm font-semibold">
                  {group.category}:
                </span>
                <span className="text-foreground/88 dark:text-foreground/82 text-sm">
                  {group.items.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
