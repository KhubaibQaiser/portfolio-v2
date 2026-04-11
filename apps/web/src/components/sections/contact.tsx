"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, AlertCircle, Mail, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type ContactSectionProps = {
  email: string;
};

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ContactSection({ email }: ContactSectionProps) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      turnstileToken: "placeholder",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to send message");
      }

      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong",
      );
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
    <section
      id="contact"
      className="py-[var(--section-padding-y)]"
      aria-label="Contact"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="font-mono text-sm text-accent">05. What&apos;s Next?</p>
          <h2 className="mt-3 text-[length:var(--text-h1)] font-semibold tracking-tight">
            Get In Touch
          </h2>
          <p className="mt-4 text-[length:var(--text-body-lg)] leading-relaxed text-muted-foreground">
            I&apos;m currently open to new opportunities. Whether you have a
            question or just want to say hi, my inbox is always open.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              {email}
            </a>
            <button
              onClick={handleCopyEmail}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                    "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                    "text-sm text-foreground placeholder:text-muted-foreground/50",
                    "transition-colors duration-200 focus:border-accent focus:outline-none",
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
                    "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                    "text-sm text-foreground placeholder:text-muted-foreground/50",
                    "transition-colors duration-200 focus:border-accent focus:outline-none",
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
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm text-foreground placeholder:text-muted-foreground/50",
                  "transition-colors duration-200 focus:border-accent focus:outline-none",
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
                rows={5}
                className={cn(
                  "w-full resize-none rounded-lg border border-border bg-muted/30 px-4 py-2.5",
                  "text-sm text-foreground placeholder:text-muted-foreground/50",
                  "transition-colors duration-200 focus:border-accent focus:outline-none",
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
                "flex w-full items-center justify-center gap-2 rounded-full bg-accent px-8 py-3",
                "text-sm font-medium text-accent-foreground transition-all duration-200",
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
