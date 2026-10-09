import { NextRequest, NextResponse } from "next/server";
import {
  validateSchedulerAuthentication,
  runScheduledJobCycle,
} from "@/features/background-jobs";

/**
 * Scheduled Cron Worker Endpoint
 * Route: POST /api/cron/process-jobs (also accepts GET for standard Vercel Cron runners)
 *
 * SECURITY INVARIANTS:
 * 1. Fails closed (401 Unauthorized) if CRON_SECRET or SCHEDULER_SECRET is missing or invalid.
 * 2. Never executes without authentic secret header.
 * 3. Enforces bounded batch size and execution limits.
 */
async function handleScheduledExecution(req: NextRequest) {
  // 1. Extract secret from Authorization header or x-cron-secret header
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

  // 2. Parse optional batch size override
  const url = new URL(req.url);
  const rawBatch = url.searchParams.get("batchSize");
  const batchSize = rawBatch ? Math.min(50, Math.max(1, parseInt(rawBatch, 10))) : 20;

  try {
    const result = await runScheduledJobCycle({
      authHeaderOrSecret: authHeader,
      batchSize,
      skipAuthCheck: false,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Scheduled job execution failed";
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
  return handleScheduledExecution(req);
}

export async function GET(req: NextRequest) {
  return handleScheduledExecution(req);
}
