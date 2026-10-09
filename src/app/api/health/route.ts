import { NextResponse } from "next/server";
import { checkReadiness } from "@/features/observability/health";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

/**
 * Standard health route preserving backward compatibility while incorporating Phase 3.18 readiness checks.
 */
export async function GET() {
  const readiness = await checkReadiness();

  return NextResponse.json(
    {
      status: readiness.status === "HEALTHY" ? "healthy" : "degraded",
      service: "agromarket-core",
      timestamp: readiness.timestamp,
      environment: env.NODE_ENV,
      version: "0.1.0",
      checks: {
        runtime: "ready",
        database: readiness.checks.database.status,
        environment: readiness.checks.environment.status,
      },
    },
    { status: readiness.status === "HEALTHY" ? 200 : 503 }
  );
}
