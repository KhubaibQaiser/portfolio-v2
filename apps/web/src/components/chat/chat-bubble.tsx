"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssistantMarkdown } from "./assistant-markdown";

const SUGGESTED_QUESTIONS = [
  "What's Khubaib's strongest skill?",
  "Tell me about his AWS experience",
  "What companies has he worked at?",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

const GREETING =
  "Hi! I'm Khubaib's AI assistant. Ask me anything about his experience, projects, or skills.";

function getTextContent(msg: {
  parts?: Array<{ type: string; text?: string }>;
}): string {
  return (
    msg.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

type MessageRowProps = {
  role: "user" | "assistant";
  content: string;
};

const MessageRow = memo(function MessageRow({
  role,
  content,
}: MessageRowProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        role === "user" ? "justify-end" : "justify-start",
      )}
    >
      {role === "assistant" && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Bot className="h-3.5 w-3.5 text-accent" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
          role === "user"
            ? "bg-accent text-accent-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {role === "assistant" ? (
          <AssistantMarkdown content={content} />
        ) : (
          content
        )}
      </div>
      {role === "user" && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
          <User className="h-3.5 w-3.5 text-accent-foreground" />
        </div>
      )}
    </div>
  );
});

const pulseRing = {
  initial: { scale: 1, opacity: 0.5 },
  animate: {
    scale: [1, 1.8, 1.8],
    opacity: [0.4, 0.15, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeOut" as const },
  },
};

const floatingBubble = {
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const iconSwap = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, 0, 12, -12, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages: chatMessages, sendMessage, status, error } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollToBottom();
    const t1 = window.setTimeout(scrollToBottom, 0);
    const t2 = window.setTimeout(scrollToBottom, 220);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(raf);
  }, [open, chatMessages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (open && !isLoading) {
      inputRef.current?.focus();
    }
  }, [open, isLoading, chatMessages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  }

  function askQuestion(q: string) {
    sendMessage({ text: q });
  }

  const lastMsg = chatMessages[chatMessages.length - 1];
  const showThinking = isLoading && (!lastMsg || lastMsg.role === "user");

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 1.5, duration: 0.4, ease: "backOut" }}
          >
            {/* Pulsing rings */}
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full bg-accent"
              variants={pulseRing}
              initial="initial"
              animate="animate"
              aria-hidden
            />
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full bg-accent"
              variants={pulseRing}
              initial="initial"
              animate="animate"
              style={{ animationDelay: "1.1s" }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1.1,
              }}
              aria-hidden
            />

            {/* Floating button */}
            <motion.button
              onClick={() => setOpen(true)}
              variants={floatingBubble}
              animate="animate"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center",
                "rounded-full bg-accent text-accent-foreground",
                "shadow-[0_8px_30px_-4px] shadow-accent/40",
                "cursor-pointer",
              )}
              aria-label="Open AI chat"
            >
              <motion.span variants={iconSwap} initial="initial" animate="animate">
                <MessageCircle className="h-6 w-6" />
              </motion.span>

              {/* Robot badge */}
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm ring-2 ring-accent/20">
                <Bot className="h-3 w-3 text-accent" />
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{
              duration: 0.25,
              ease: [0.22, 1, 0.36, 1] as const,
            }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex min-h-0 flex-col",
              "h-[500px] w-[380px] max-h-[80vh] max-w-[calc(100vw-3rem)]",
              "rounded-2xl border border-border/60 bg-background overflow-hidden",
              "shadow-[0_20px_60px_-12px] shadow-black/25 dark:shadow-black/50",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">
                    Ask Khubaib
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    AI-powered
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-3"
            >
              <div className="space-y-4">
                <MessageRow role="assistant" content={GREETING} />

                {chatMessages.map((msg) => (
                  <MessageRow
                    key={msg.id}
                    role={msg.role as "user" | "assistant"}
                    content={getTextContent(msg)}
                  />
                ))}

                {showThinking && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-xs leading-relaxed text-destructive">
                      {error.message.includes("429") ||
                      error.message.toLowerCase().includes("rate limit")
                        ? "I'm getting a lot of questions right now. Please try again in a moment!"
                        : "Something went wrong. Please try again."}
                    </p>
                  </div>
                )}
              </div>

              {chatMessages.length === 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Try asking:
                  </p>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => askQuestion(q)}
                      className={cn(
                        "block w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5",
                        "text-left text-xs text-muted-foreground",
                        "transition-all duration-150",
                        "hover:border-accent/30 hover:bg-accent/5 hover:text-foreground",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="border-t border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about Khubaib's experience..."
                  className={cn(
                    "flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground/50",
                    "transition-colors duration-150",
                    "focus:border-accent/60 focus:ring-2 focus:ring-accent/10 focus:outline-none",
                  )}
                  disabled={isLoading}
                  maxLength={500}
                  name="message"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    "bg-accent text-accent-foreground",
                    "transition-all duration-150",
                    "hover:brightness-110 active:scale-95",
                    "disabled:opacity-40 disabled:hover:brightness-100",
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
