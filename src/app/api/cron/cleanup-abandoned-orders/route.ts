import { NextRequest, NextResponse } from "next/server";
import { validateSchedulerAuthentication } from "@/features/background-jobs";
import { OrderCleanupService } from "@/features/orders";

/**
 * Scheduled Cron Worker: Abandoned Order Inventory Cleanup
 * Route: POST /api/cron/cleanup-abandoned-orders (also accepts GET for standard Vercel Cron runners)
 *
 * SAFETY INVARIANTS:
 * 1. Fails closed (401 Unauthorized) if CRON_SECRET or SCHEDULER_SECRET is missing or invalid.
 * 2. Never releases stock for paid, processing, or completed orders.
 * 3. Never releases stock from an order more than once (idempotent).
 * 4. Defers cancellation if an active payment is in flight (< 15 min old).
 * 5. Bounded batch size and safe execution limits.
 */
async function handleScheduledCleanup(req: NextRequest) {
  // 1. Authenticate caller using established shared secret token convention
  const authHeader = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const authValidation = validateSchedulerAuthentication(authHeader);

  if (!authValidation.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: authValidation.reason || "Unauthorized",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  // 2. Parse configurable query parameters with safe bounds
  const url = new URL(req.url);
  const rawTimeout = url.searchParams.get("timeoutMinutes");
  const rawLimit = url.searchParams.get("limit");
  const rawDryRun = url.searchParams.get("dryRun");

  const timeoutMinutes = rawTimeout ? Math.max(15, Math.min(1440, parseInt(rawTimeout, 10))) : 60;
  const limit = rawLimit ? Math.max(1, Math.min(100, parseInt(rawLimit, 10))) : 50;
  const dryRun = rawDryRun === "true" || rawDryRun === "1";

  try {
    const result = await OrderCleanupService.cleanupAbandonedOrders({
      timeoutMinutes,
      limit,
      dryRun,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Abandoned order cleanup job failed";
    console.error("Scheduled abandoned order cleanup error:", message);
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "EXECUTION_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleScheduledCleanup(req);
}

export async function GET(req: NextRequest) {
  return handleScheduledCleanup(req);
}
