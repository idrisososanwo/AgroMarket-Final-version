import { NextResponse } from "next/server";
import { checkReadiness } from "@/features/observability/health";

export const dynamic = "force-dynamic";

/**
 * Readiness Probe: Bounded dependency check verifying essential database and env configuration.
 * Returns 200 when ready, 503 when critical dependencies are unavailable.
 * Never leaks stack traces, connection strings, or sensitive credentials.
 */
export async function GET() {
  const readiness = await checkReadiness();
  const httpStatus = readiness.status === "HEALTHY" ? 200 : 503;

  return NextResponse.json(readiness, { status: httpStatus });
}
