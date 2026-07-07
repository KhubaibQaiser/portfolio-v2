import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-accent font-mono text-8xl font-bold">404</h1>
      <h2 className="text-h2 mt-4 font-semibold tracking-tight">Page Not Found</h2>
      <p className="text-body-lg text-muted-foreground mt-3 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-accent text-accent-foreground mt-8 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
      >
        Go Home
      </Link>
    </div>
  );
}
