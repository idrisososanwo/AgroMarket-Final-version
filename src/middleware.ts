import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/account",
  "/onboarding",
  "/farmer",
  "/business",
  "/jobs",
  "/services",
  "/equipment/owner",
  "/admin",
];

const AUTH_ONLY_ROUTES = [
  "/auth/login",
  "/auth/register",
];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isAuthOnlyPath = AUTH_ONLY_ROUTES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  let response = supabaseResponse;

  // 1. Unauthenticated users attempting to access protected pages
  if (isProtectedPath && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (isAuthOnlyPath && user) {
    // 2. Authenticated users attempting to access login or registration pages
    response = NextResponse.redirect(new URL("/account", request.url));
  }

  // 3. Production Security Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // 4. Cache-Control for Sensitive & Authenticated Operations
  const SENSITIVE_NO_CACHE_PREFIXES = [
    "/api/cron",
    "/api/webhooks",
    "/admin",
    "/account",
    "/api/health",
  ];

  if (SENSITIVE_NO_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset extensions (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
