import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@portfolio/shared/supabase/database.types";

/**
 * Anonymous Supabase client for public RLS reads. No cookies — safe inside
 * `unstable_cache` and during static generation / not-found prerender.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
