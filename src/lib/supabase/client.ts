"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/generated/database.types";

let passwordRecoveryClient: SupabaseClient<Database> | undefined;

function getPublicSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Public Supabase environment variables are not configured.");
  }

  return { url, anonKey };
}

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getPublicSupabaseConfig();

  return createBrowserClient<Database>(url, anonKey);
}

export function createPasswordRecoverySupabaseClient() {
  if (passwordRecoveryClient) {
    return passwordRecoveryClient;
  }

  const { url, anonKey } = getPublicSupabaseConfig();

  passwordRecoveryClient = createClient<Database>(url, anonKey, {
    auth: {
      flowType: "implicit",
      storageKey: "learningapp-password-recovery",
    },
  });

  return passwordRecoveryClient;
}
