import { NextResponse } from "next/server";
import { ObservabilityService } from "@/features/observability/service";

export const dynamic = "force-dynamic";

/**
 * Production Readiness Assessment Endpoint (Phase 3.19)
 * Route: GET /api/health/readiness
 *
 * Returns an evidence-grounded assessment of platform capabilities distinguishing:
 * - VERIFIED: Checked successfully with real operational evidence.
 * - CONFIGURED: Configuration/keys present, but external gateway unverified.
 * - UNAVAILABLE: Subsystem is deliberately disabled or missing credentials.
 * - UNKNOWN: Remote cloud/provider state uninspectable from application.
 * - DEGRADED: Responding with active errors or backlogs.
 *
 * Never exposes secrets, database connection strings, user data, or stack traces.
 */
export async function GET() {
  const report = await ObservabilityService.getProductionReadinessReport();
  const httpStatus = report.overallState === "UNAVAILABLE" ? 503 : 200;

  return NextResponse.json(report, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
