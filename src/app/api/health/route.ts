import { NextResponse } from "next/server";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "agromarket-core",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: "0.1.0",
      checks: {
        runtime: "ready",
        supabaseConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
    },
    { status: 200 }
  );
}
