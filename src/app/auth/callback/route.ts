import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/config/env";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth Callback Route Handler.
 * Exchanging authorization code for an authenticated session cookie (PKCE flow),
 * then securely redirects user to the intended destination (e.g., /auth/reset-password or /auth/verify).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const baseUrl = getAppBaseUrl();

  // If Supabase returned an authentication error from the link
  if (errorParam || errorDescription) {
    const errorMsg = errorDescription || errorParam || "Authentication error occurred.";
    console.error("Supabase auth callback received error:", { errorParam, errorDescription });
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorMsg)}`, baseUrl)
    );
  }

  // If authorization code is present, exchange it for session cookies
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Validate redirect destination to prevent open-redirect vulnerabilities
      const safeDestination = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return NextResponse.redirect(new URL(safeDestination, baseUrl));
    }

    console.error("Supabase exchangeCodeForSession failed:", exchangeError.message);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, baseUrl)
    );
  }

  // Fallback: If no code and no error was provided
  return NextResponse.redirect(new URL("/auth/login", baseUrl));
}
