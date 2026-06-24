import { createClient } from "@/lib/supabase/server";
import { isAllowedAdmin } from "@portfolio/shared/constants";

export type AdminAuth = { ok: true; email: string } | { ok: false; error: string };

/**
 * Authorizes the current request as an allow-listed admin.
 *
 * The data layer (DynamoDB) has no row-level security, so authorization must be
 * enforced explicitly at every mutation boundary rather than relying on the
 * middleware route guard alone. This wraps the current (Supabase) session; when
 * Cognito lands it becomes the single place that swaps to the AuthProvider port.
 */
export async function requireAdmin(): Promise<AdminAuth> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user?.email || !isAllowedAdmin(user.email)) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, email: user.email };
}
