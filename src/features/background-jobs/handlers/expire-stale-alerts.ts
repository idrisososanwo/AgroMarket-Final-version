/**
 * AgroMarket Phase 3.17: Expire Stale Alerts Handler
 * Transitions past-expiry alerts from PUBLISHED to EXPIRED.
 * Never mutates underlying intelligence observations.
 */

import {
  JobHandler,
  JobExecutionContext,
  JobExecutionResult,
  ExpireStaleAlertsPayload,
} from "../types";
import { expireStaleAlertsPayloadSchema } from "../validation";
import { getAdminClientSafely } from "../data-layer";
import { getInMemoryAlerts } from "@/features/notifications/data-layer";

export class ExpireStaleAlertsHandler
  implements JobHandler<ExpireStaleAlertsPayload, { expiredCount: number; expiredAlertIds: string[] }>
{
  readonly jobType = "EXPIRE_STALE_ALERTS" as const;

  async execute(
    payload: ExpireStaleAlertsPayload,
    context: JobExecutionContext
  ): Promise<JobExecutionResult<{ expiredCount: number; expiredAlertIds: string[] }>> {
    const parsed = expireStaleAlertsPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        errorCategory: "VALIDATION_FAILED",
        errorMessage: parsed.error.issues.map((i) => i.message).join(", "),
        retryable: false,
      };
    }

    const { dryRun, batchLimit } = parsed.data;
    const limit = batchLimit ?? 100;
    const nowIso = context.now.toISOString();

    const expiredAlertIds: string[] = [];

    // 1. Process in-memory alerts (test store & offline resilience)
    const inMem = getInMemoryAlerts();
    for (const alert of inMem) {
      if (
        alert.publicationStatus === "PUBLISHED" &&
        alert.expiresAt &&
        alert.expiresAt <= nowIso
      ) {
        if (!dryRun) {
          alert.publicationStatus = "EXPIRED";
          alert.updatedAt = nowIso;
        }
        expiredAlertIds.push(alert.id);
        if (expiredAlertIds.length >= limit) break;
      }
    }

    // 2. Process database alerts if client is available
    const supabase = getAdminClientSafely();

    if (supabase && expiredAlertIds.length < limit) {
      const { data: dbAlerts, error } = await supabase
        .from("agricultural_intelligence_alerts")
        .select("id")
        .eq("publication_status", "PUBLISHED")
        .lte("expires_at", nowIso)
        .limit(limit - expiredAlertIds.length);

      if (!error && dbAlerts) {
        const idsToUpdate = dbAlerts.map((r) => r.id);
        if (!dryRun && idsToUpdate.length > 0) {
          await supabase
            .from("agricultural_intelligence_alerts")
            .update({
              publication_status: "EXPIRED",
              updated_at: nowIso,
            })
            .in("id", idsToUpdate);
        }
        expiredAlertIds.push(...idsToUpdate);
      }
    }

    const uniqueExpiredIds = Array.from(new Set(expiredAlertIds));

    return {
      success: true,
      result: {
        expiredCount: uniqueExpiredIds.length,
        expiredAlertIds: uniqueExpiredIds,
      },
    };
  }
}
