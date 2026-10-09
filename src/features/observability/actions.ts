"use server";

/**
 * AgroMarket Phase 3.18: Observability Server Actions
 *
 * RESTRICTED ACCESS:
 * Exclusively callable by verified platform administrators (ADMIN role).
 */

import { requireRole } from "@/lib/auth/server";
import { ObservabilityService } from "./service";
import { OperationalDashboardData } from "./types";
import { sanitizeErrorMessage } from "@/features/background-jobs/validation";

export async function getOperationalDashboardAction(): Promise<{
  success: boolean;
  data?: OperationalDashboardData;
  error?: string;
}> {
  try {
    // Strict Administrator Authentication Barrier
    await requireRole("ADMIN");

    const data = await ObservabilityService.getOperationalDashboardData();
    return {
      success: true,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: sanitizeErrorMessage(errorMsg),
    };
  }
}
