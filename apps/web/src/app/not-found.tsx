import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-mono text-8xl font-bold text-accent">404</h1>
      <h2 className="mt-4 text-[length:var(--text-h2)] font-semibold tracking-tight">
        Page Not Found
      </h2>
      <p className="mt-3 max-w-md text-[length:var(--text-body-lg)] text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-all duration-200 hover:opacity-90 active:scale-95"
      >
        Go Home
      </Link>
    </div>
  );
}
