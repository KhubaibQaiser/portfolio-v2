import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createSupabaseClient(
  url: string,
  key: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, key);
}

export function createSupabaseServerClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
