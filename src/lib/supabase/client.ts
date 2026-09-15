import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Creates a browser-side Supabase client.
 * Safe to use in Client Components ("use client").
 * Relies on publishable anon key and Supabase Row Level Security (RLS).
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
