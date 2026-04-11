import { createClient } from "@supabase/supabase-js";
import type { Database } from "@portfolio/shared/supabase/database.types";

/**
 * Singleton anonymous Supabase client for public RLS reads.
 * Stateless (no cookies/session) — safe inside `unstable_cache`,
 * static generation, and not-found prerenders.
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
