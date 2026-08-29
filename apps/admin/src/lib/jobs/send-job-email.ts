import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type JobEmailJob = {
  id: string;
  company: string;
  title: string;
  score: number;
  applyUrl: string;
};

export type SendJobEmailInput = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  introHtml: string;
  jobs: JobEmailJob[];
  adminOrigin: string;
};

export async function sendJobEmail(input: SendJobEmailInput): Promise<{ id: string }> {
  const resend = new Resend(input.apiKey);
  const rows = input.jobs
    .map((job) => {
      const href = `${input.adminOrigin.replace(/\/$/, "")}/jobs/${encodeURIComponent(job.id)}`;
      return `<li><strong>${escapeHtml(job.company)}</strong> — ${escapeHtml(job.title)} (score ${job.score}) · <a href="${escapeHtml(href)}">admin</a> · <a href="${escapeHtml(job.applyUrl)}">apply</a></li>`;
    })
    .join("");

  const { data, error } = await resend.emails.send({
    from: input.from,
    to: [input.to],
    subject: input.subject,
    html: `
      <div style="font-family: -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a;">
        ${input.introHtml}
        <ul>${rows}</ul>
      </div>
    `.trim(),
  });

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Resend returned no message id");
  return { id: data.id };
}
