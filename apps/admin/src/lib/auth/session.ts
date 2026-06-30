import "server-only";
import { headers } from "next/headers";
import type { AdminIdentity } from "@portfolio/shared/ports";
import { getAuth } from "@/lib/auth";
import { mapSessionToIdentity } from "@/lib/auth/identity";

/**
 * Resolves the admin identity from the Better Auth session. Returns null for an
 * absent/invalid session — an expected unauthenticated state, not a swallowed
 * error. Secret-fetch and config failures propagate from {@link getAuth}.
 */
export async function getCurrentIdentity(): Promise<AdminIdentity | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return mapSessionToIdentity(session);
}
