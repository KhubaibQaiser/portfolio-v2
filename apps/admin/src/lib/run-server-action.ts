import type { ActionResult } from "@/lib/actions";

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Maps thrown Server Action / network errors to a user-facing message. */
export function actionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return GENERIC_ERROR;

  const message = error.message.trim();
  if (!message) return GENERIC_ERROR;

  // Next.js hides production Server Action failures behind digests / generic text.
  if (
    message.includes("Invalid Server Actions request") ||
    message.includes("Server Components render") ||
    message.includes("digest") ||
    message === "An error occurred in the Server Components render."
  ) {
    return "Save failed. Please refresh the page and try again.";
  }

  return message;
}

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export type RunServerActionOptions = {
  successMessage?: string;
  onSuccess?: () => void;
};

/**
 * Invokes a server action, surfaces success/error via toast, and never throws —
 * so callers always get an ActionResult even when the action RPC fails.
 */
export async function runServerAction(
  action: () => Promise<ActionResult>,
  toast: ToastApi,
  options?: RunServerActionOptions,
): Promise<ActionResult> {
  try {
    const result = await action();
    if (result.success) {
      toast.success(options?.successMessage ?? "Saved!");
      options?.onSuccess?.();
    } else {
      toast.error(result.error);
    }
    return result;
  } catch (error) {
    const message = actionErrorMessage(error);
    toast.error(message);
    return { success: false, error: message };
  }
}
