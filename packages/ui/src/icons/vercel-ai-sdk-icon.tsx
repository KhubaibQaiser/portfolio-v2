import type { SVGProps } from "react";
import { Bot } from "lucide-react";

/**
 * Chatbot / AI stack — used for Vercel AI SDK in the hero marquee (custom; no Simple Icons entry).
 */
export function VercelAiSdkIcon({
  className,
  color,
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <Bot
      width={width}
      height={height}
      className={className}
      color={color ?? "currentColor"}
      aria-hidden
      strokeWidth={2}
      {...props}
    />
  );
}
