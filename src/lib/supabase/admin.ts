import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Privileged Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL SECURITY WARNING:
 * - Bypasses Row Level Security (RLS).
 * - Must NEVER be exposed to the client/browser.
 * - Used strictly in server-side background tasks, webhooks, or trusted admin services.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("CRITICAL SECURITY VIOLATION: createAdminClient cannot be called from the browser.");
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in server environment variables.");
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
