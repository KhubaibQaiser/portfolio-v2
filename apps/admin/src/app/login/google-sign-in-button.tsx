"use client";

import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";

export function GoogleSignInButton() {
  async function handleSignIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login",
    });
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignIn()}
      className="bg-accent text-accent-foreground mt-8 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
    >
      <LogIn className="h-4 w-4" />
      Continue with Google
    </button>
  );
}
