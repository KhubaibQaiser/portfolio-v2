import "server-only";
import { Resend } from "resend";
import type { ContactFormData } from "@portfolio/shared/schemas/contact";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type SendContactEmailInput = Pick<
  ContactFormData,
  "name" | "email" | "subject" | "message"
>;

export async function sendContactEmail(
  apiKey: string,
  from: string,
  to: string,
  data: SendContactEmailInput,
): Promise<{ id: string }> {
  const resend = new Resend(apiKey);
  const safeName = escapeHtml(data.name.trim());
  const safeEmail = escapeHtml(data.email.trim());
  const safeSubject = escapeHtml(data.subject.trim());
  const safeMessage = escapeHtml(data.message.trim()).replaceAll("\n", "<br />");

  const { data: result, error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: data.email.trim(),
    subject: `[Portfolio] ${data.subject.trim()}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a;">
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p style="white-space: pre-wrap;">${safeMessage}</p>
      </div>
    `.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!result?.id) {
    throw new Error("Resend returned no message id");
  }

  return { id: result.id };
}
