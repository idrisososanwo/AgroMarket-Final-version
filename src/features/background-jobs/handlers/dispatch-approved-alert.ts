/**
 * AgroMarket Phase 3.17: Approved Alert Dispatch Handler
 * Dispatches verified, PUBLISHED alerts to eligible recipients.
 *
 * SAFETY INVARIANTS:
 * - Only PUBLISHED alerts are dispatched. DRAFT, PENDING_REVIEW, WITHHELD, EXPIRED are rejected.
 * - Respects targeting, quiet hours, user preferences, and idempotency.
 * - Strict Anti-Pork Zero Tolerance.
 * - External delivery channels honestly report UNAVAILABLE.
 */

import {
  JobHandler,
  JobExecutionContext,
  JobExecutionResult,
  DispatchApprovedAlertPayload,
} from "../types";
import { dispatchApprovedAlertPayloadSchema, assertNoProhibitedProduceBackgroundJob } from "../validation";
import {
  fetchAlertById,
  fetchUserTargetingCandidates,
  insertNotificationRecord,
  insertDeliveryRecord,
  getInMemoryAlerts,
} from "@/features/notifications/data-layer";
import { findEligibleRecipients } from "@/features/notifications/audience-matcher";
import { getDeliveryProvider } from "@/features/notifications/delivery-providers";
import {
  UserNotificationItem,
  NotificationDeliveryRecord,
  DeliveryChannel,
  NotificationPreferences,
} from "@/features/notifications/types";
import { getAdminClientSafely } from "../data-layer";

export class DispatchApprovedAlertHandler
  implements JobHandler<DispatchApprovedAlertPayload, { dispatchedCount: number; recipientUserIds: string[] }>
{
  readonly jobType = "DISPATCH_APPROVED_ALERT" as const;

  async execute(
    payload: DispatchApprovedAlertPayload,
    context: JobExecutionContext
  ): Promise<JobExecutionResult<{ dispatchedCount: number; recipientUserIds: string[] }>> {
    // 1. Schema Validation
    const parsed = dispatchApprovedAlertPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        errorCategory: "VALIDATION_FAILED",
        errorMessage: parsed.error.issues.map((i) => i.message).join(", "),
        retryable: false,
      };
    }

    const { alertId } = parsed.data;

    // 2. Fetch Alert Record
    const supabase = getAdminClientSafely();

    let alert = await fetchAlertById(supabase, alertId);
    if (!alert) {
      // Check in-memory store for test resilience
      const inMem = getInMemoryAlerts();
      alert = inMem.find((a) => a.id === alertId) || null;
    }

    if (!alert) {
      return {
        success: false,
        errorCategory: "PERMANENT",
        errorMessage: `Alert with ID ${alertId} not found.`,
        retryable: false,
      };
    }

    // 3. Zero-Tolerance Anti-Pork Invariant Check
    try {
      assertNoProhibitedProduceBackgroundJob(alert.title, "Alert Title");
      assertNoProhibitedProduceBackgroundJob(alert.summary, "Alert Summary");
    } catch (err: unknown) {
      return {
        success: false,
        errorCategory: "INVARIANT_VIOLATION",
        errorMessage: err instanceof Error ? err.message : "Anti-pork violation in alert.",
        retryable: false,
      };
    }

    // 4. Governance & Publication Status Check
    // NEVER dispatch DRAFT, PENDING_REVIEW, WITHHELD, or EXPIRED alerts
    if (alert.publicationStatus !== "PUBLISHED") {
      return {
        success: false,
        errorCategory: "PERMANENT",
        errorMessage: `Cannot dispatch alert in ${alert.publicationStatus} status. Only PUBLISHED alerts may be dispatched.`,
        retryable: false,
      };
    }

    // 5. Expiry Check
    if (alert.expiresAt && new Date(alert.expiresAt).getTime() <= context.now.getTime()) {
      return {
        success: false,
        errorCategory: "PERMANENT",
        errorMessage: `Alert has expired at ${alert.expiresAt}.`,
        retryable: false,
      };
    }

    // 6. Find Eligible Recipients (Targeting, Preferences, Quiet Hours)
    const candidates = await fetchUserTargetingCandidates(supabase);
    const recipientUserIds = findEligibleRecipients(candidates, alert, context.now);

    let dispatchedCount = 0;

    for (const userId of recipientUserIds) {
      const notificationId = crypto.randomUUID();
      const idempotencyKey = `alert_${alert.id}_user_${userId}`;

      const candidate = candidates.find((c) => c.userId === userId);
      const candidatePrefs = candidate?.preferences as
        | (NotificationPreferences & { preferredChannels?: DeliveryChannel[] })
        | null
        | undefined;
      const channels: DeliveryChannel[] = Array.from(
        new Set([
          "IN_APP" as DeliveryChannel,
          ...(candidatePrefs?.preferredChannels || candidatePrefs?.enabledChannels || []),
        ])
      );

      const notificationItem: UserNotificationItem = {
        id: notificationId,
        userId,
        alertId: alert.id,
        type: alert.category,
        channel: "IN_APP",
        title: alert.title,
        body: alert.summary,
        actionUrl: `/notifications?alert=${alert.id}`,
        isRead: false,
        severity: alert.severity,
        expiresAt: alert.expiresAt ?? null,
        idempotencyKey,
        sourceReference: alert.sourceReference,
        sourceSystem: alert.sourceEntityType,
        confidence: alert.confidenceScore ?? null,
        createdAt: context.now.toISOString(),
      };

      // Atomic insert with idempotency
      const created = await insertNotificationRecord(supabase, notificationItem);
      if (created) {
        dispatchedCount++;
      }

      // Record multi-channel delivery audit entries
      for (const channel of channels) {
        const provider = getDeliveryProvider(channel);
        const deliveryResult = await provider.send({
          notificationId,
          userId,
          channel,
          title: alert.title,
          body: alert.summary,
        });

        const deliveryRecord: NotificationDeliveryRecord = {
          id: crypto.randomUUID(),
          notificationId,
          alertId: alert.id,
          userId,
          channel,
          deliveryStatus: deliveryResult.status,
          attemptCount: 1,
          lastAttemptAt: context.now.toISOString(),
          deliveredAt: deliveryResult.deliveredAt ?? null,
          errorCode: deliveryResult.errorCode ?? null,
          errorMessage: deliveryResult.errorMessage ?? null,
          providerResponse: deliveryResult.providerResponse ?? {},
          createdAt: context.now.toISOString(),
        };

        await insertDeliveryRecord(supabase, deliveryRecord);
      }
    }

    return {
      success: true,
      result: {
        dispatchedCount,
        recipientUserIds,
      },
    };
  }
}
