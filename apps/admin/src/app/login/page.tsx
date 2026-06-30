import { AlertCircle } from "lucide-react";
import { GoogleSignInButton } from "./google-sign-in-button";

// Known error codes get a tailored message. Better Auth also emits its own
// codes (e.g. `googleSub_is_required`, `access_denied`) on the `error` param;
// anything unmapped falls back to a generic message rather than being hidden.
const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "This account is not authorized to access the admin dashboard.",
  invalid_state: "Your sign-in session expired. Please try again.",
  missing_code: "Invalid authentication request.",
  auth_failed: "Authentication failed. Please try again.",
  access_denied: "Sign-in was cancelled.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error: rawError } = await searchParams;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;
  const message = error
    ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.")
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in with Google to manage your portfolio content.
        </p>

        {message && (
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        <GoogleSignInButton />

        <p className="text-muted-foreground mt-4 text-center text-xs">
          Only allow-listed Google accounts can access this dashboard.
        </p>
      </div>
    </div>
  );
}
