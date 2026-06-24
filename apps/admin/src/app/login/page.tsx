import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "This account is not authorized to access the admin dashboard.",
  invalid_state: "Your sign-in session expired. Please try again.",
  missing_code: "Invalid authentication request.",
  auth_failed: "Authentication failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "An error occurred.") : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in to manage your portfolio content.
        </p>

        {message && (
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        <Link
          href="/auth/login"
          prefetch={false}
          className="bg-accent text-accent-foreground mt-8 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Continue to sign in
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          You&apos;ll be redirected to the secure Cognito sign-in page.
        </p>
      </div>
    </div>
  );
}
