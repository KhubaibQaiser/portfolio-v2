"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/toast/toast-provider";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
