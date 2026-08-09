import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/generated/database.types";

function getAdminSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Server-only Supabase environment variables are not configured.");
  }

  return { url, serviceRoleKey };
}

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getAdminSupabaseConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
