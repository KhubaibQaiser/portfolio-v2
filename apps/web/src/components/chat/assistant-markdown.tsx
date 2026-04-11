import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

const remarkPlugins = [remarkGfm];

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-accent underline underline-offset-2 hover:opacity-90"
    >
      {children}
    </a>
  ),
  code: ({ className: codeClass, children, ...props }) => {
    const isBlock = Boolean(codeClass?.includes("language-"));
    if (isBlock) {
      return (
        <code
          className={cn(
            "block w-full overflow-x-auto font-mono text-xs text-foreground",
            codeClass,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.8125rem]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 max-w-full overflow-x-auto rounded-lg border border-border/50 bg-background/50 p-2 last:mb-0">
      {children}
    </pre>
  ),
  h1: ({ children }) => (
    <h3 className="mb-2 text-base font-semibold tracking-tight">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 text-sm font-semibold tracking-tight">{children}</h4>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1.5 text-sm font-semibold">{children}</h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-accent/40 pl-3 text-muted-foreground italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border/60" />,
  table: ({ children }) => (
    <div className="mb-2 max-w-full overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border/50 px-2 py-1.5 align-top">
      {children}
    </td>
  ),
};

type AssistantMarkdownProps = {
  content: string;
  className?: string;
};

export const AssistantMarkdown = memo(function AssistantMarkdown({
  content,
  className,
}: AssistantMarkdownProps) {
  return (
    <div className={cn("chat-md text-sm leading-relaxed", className)}>
      <Markdown remarkPlugins={remarkPlugins} components={mdComponents}>
        {content}
      </Markdown>
    </div>
  );
});
