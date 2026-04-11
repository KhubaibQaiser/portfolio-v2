"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "What's Khubaib's strongest skill?",
  "Tell me about his AWS experience",
  "What companies has he worked at?",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

const GREETING = "Hi! I'm Khubaib's AI assistant. Ask me anything about his experience, projects, or skills.";

function getTextContent(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  return msg.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("") ?? "";
}

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages: chatMessages, sendMessage, status } = useChat({
    transport,
  });

  const messages = useMemo(
    () => [
      { id: "greeting", role: "assistant" as const, content: GREETING },
      ...chatMessages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: getTextContent(m) })),
    ],
    [chatMessages],
  );

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  }

  function askQuestion(q: string) {
    sendMessage({ text: q });
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center",
          "rounded-full bg-accent text-accent-foreground shadow-lg",
          "transition-all duration-200 hover:scale-105 active:scale-95",
          open && "hidden",
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, duration: 0.3 }}
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex flex-col",
              "h-[500px] w-[380px] max-h-[80vh] max-w-[calc(100vw-3rem)]",
              "rounded-2xl border border-border bg-background shadow-xl overflow-hidden",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold">Ask Khubaib</span>
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                  AI
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Bot className="h-3.5 w-3.5 text-accent" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                        <User className="h-3.5 w-3.5 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                    </div>
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                )}
              </div>

              {messages.length <= 1 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Try asking:</p>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => askQuestion(q)}
                      className="block w-full rounded-lg border border-border/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about Khubaib's experience..."
                  className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
                  disabled={isLoading}
                  maxLength={500}
                  name="message"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-50"
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
