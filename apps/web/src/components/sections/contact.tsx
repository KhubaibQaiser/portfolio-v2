"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, AlertCircle, Mail, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";
import {
  ContactTurnstile,
  type ContactTurnstileHandle,
} from "@/components/sections/contact-turnstile";

type ContactSectionProps = {
  email: string;
};

type FormStatus = "idle" | "submitting" | "success" | "error";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function firstValidationMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("issues" in body)) {
    return undefined;
  }
  const issues = (body as { issues: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return undefined;
  const first = issues[0];
  if (typeof first !== "object" || first === null || !("message" in first)) {
    return undefined;
  }
  const message = (first as { message: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

export function ContactSection({ email }: ContactSectionProps) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const turnstileRef = useRef<ContactTurnstileHandle>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const base = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    try {
      let turnstileToken = "";
      if (turnstileSiteKey) {
        turnstileToken = await turnstileRef.current!.getToken();
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, turnstileToken }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        capturePortfolioEvent(PortfolioEvents.contactSubmit, {
          result: "http_error",
          status: res.status,
        });
        setStatus("error");
        setErrorMessage(
          firstValidationMessage(body) ??
            (typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof (body as { error: unknown }).error === "string"
              ? (body as { error: string }).error
              : "Failed to send message"),
        );
        turnstileRef.current?.reset();
        return;
      }

      capturePortfolioEvent(PortfolioEvents.contactSubmit, { result: "success" });
      setStatus("success");
      (e.target as HTMLFormElement).reset();
      turnstileRef.current?.reset();
    } catch {
      capturePortfolioEvent(PortfolioEvents.contactSubmit, {
        result: "network_error",
      });
      setStatus("error");
      setErrorMessage("Something went wrong");
      turnstileRef.current?.reset();
    }
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <section id="contact" className="py-(--section-padding-y)" aria-label="Contact">
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-accent font-mono text-sm">05. What&apos;s Next?</p>
          <h2 className="text-h1 mt-3 font-semibold tracking-tight">Get In Touch</h2>
          <p className="text-body-lg text-muted-foreground mt-4 leading-relaxed">
            I&apos;m currently open to new opportunities. Whether you have a question or
            just want to say hi, my inbox is always open.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <a
              href={`mailto:${email}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
            >
              <Mail className="h-4 w-4" />
              {email}
            </a>
            <button
              onClick={handleCopyEmail}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
              aria-label="Copy email"
            >
              {copied ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4 text-left">
            {turnstileSiteKey ? (
              <ContactTurnstile ref={turnstileRef} siteKey={turnstileSiteKey} />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={cn(
                    "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                    "text-foreground placeholder:text-muted-foreground/50 text-sm",
                    "focus:border-accent transition-colors duration-200 focus:outline-hidden",
                  )}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={cn(
                    "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                    "text-foreground placeholder:text-muted-foreground/50 text-sm",
                    "focus:border-accent transition-colors duration-200 focus:outline-hidden",
                  )}
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                className={cn(
                  "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                  "text-foreground placeholder:text-muted-foreground/50 text-sm",
                  "focus:border-accent transition-colors duration-200 focus:outline-hidden",
                )}
                placeholder="What's this about?"
              />
            </div>
            <div>
              <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                rows={5}
                className={cn(
                  "border-border bg-muted/30 w-full resize-none rounded-lg border px-4 py-2.5",
                  "text-foreground placeholder:text-muted-foreground/50 text-sm",
                  "focus:border-accent transition-colors duration-200 focus:outline-hidden",
                )}
                placeholder="Your message..."
              />
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Message sent! I&apos;ll get back to you soon.
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {errorMessage || "Failed to send. Please try again."}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className={cn(
                "bg-accent flex w-full items-center justify-center gap-2 rounded-full px-8 py-3",
                "text-accent-foreground text-sm font-medium transition-all duration-200",
                "hover:opacity-90 active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {status === "submitting" ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
