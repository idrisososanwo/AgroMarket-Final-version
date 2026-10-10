import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";
import { getAppBaseUrl } from "@/config/env";

const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}));

describe("Auth Callback Route Handler (/auth/callback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges code for session and redirects to valid destination", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid-code-123&next=/auth/reset-password"
    );

    const res = await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-code-123");
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/reset-password");
  });

  it("sanitizes open-redirect attempts to safe root path", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid-code-123&next=https://malicious-site.com"
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    // Should fallback to base root rather than third-party host
    expect(location).not.toContain("malicious-site.com");
  });

  it("redirects to login with error parameter when Supabase returns error", async () => {
    const req = new NextRequest(
      "http://localhost:3000/auth/callback?error=access_denied&error_description=User+cancelled"
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login?error=User%20cancelled");
  });

  it("redirects to login with error if code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "Auth code expired" },
    });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=expired-code"
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login?error=Auth%20code%20expired");
  });
});

describe("getAppBaseUrl Configuration Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("prioritizes NEXT_PUBLIC_APP_URL when present", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://agromarket.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "project.vercel.app";
    expect(getAppBaseUrl()).toBe("https://agromarket.com");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "agro-market-final-version-6hzc.vercel.app";
    expect(getAppBaseUrl()).toBe("https://agro-market-final-version-6hzc.vercel.app");
  });

  it("falls back to VERCEL_URL when production URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "deployment-branch.vercel.app";
    expect(getAppBaseUrl()).toBe("https://deployment-branch.vercel.app");
  });

  it("falls back to http://localhost:3000 in local dev environment without Vercel headers", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });
});
