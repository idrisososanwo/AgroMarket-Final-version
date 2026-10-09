/**
 * AgroMarket Phase 3.17: Notification Delivery Retry Handler
 * Retries eligible transient failures without duplicate receipts.
 */

import {
  JobHandler,
  JobExecutionContext,
  JobExecutionResult,
  RetryNotificationDeliveryPayload,
} from "../types";
import { retryNotificationDeliveryPayloadSchema } from "../validation";
import { retryNotificationDelivery } from "@/features/notifications/alert-pipeline";
import { getAdminClientSafely } from "../data-layer";
import { getInMemoryDeliveries } from "@/features/notifications/data-layer";

export class RetryNotificationDeliveryHandler
  implements JobHandler<RetryNotificationDeliveryPayload, { status: string; attemptCount: number }>
{
  readonly jobType = "RETRY_NOTIFICATION_DELIVERY" as const;

  async execute(
    payload: RetryNotificationDeliveryPayload,
    context: JobExecutionContext
  ): Promise<JobExecutionResult<{ status: string; attemptCount: number }>> {
    const parsed = retryNotificationDeliveryPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        errorCategory: "VALIDATION_FAILED",
        errorMessage: parsed.error.issues.map((i) => i.message).join(", "),
        retryable: false,
      };
    }

    const { notificationId, deliveryId, channel, maxAttempts } = parsed.data;
    const targetId = deliveryId || notificationId!;

    const supabase = getAdminClientSafely();

    // Check existing delivery record in-memory or database
    const inMem = getInMemoryDeliveries();
    const existing = inMem.find(
      (d) => d.id === targetId || (d.notificationId === targetId && (!channel || d.channel === channel))
    );

    // If already delivered, no-op success
    if (existing && existing.deliveryStatus === "DELIVERED") {
      return {
        success: true,
        result: {
          status: "DELIVERED",
          attemptCount: existing.attemptCount,
        },
      };
    }

    // If max attempts exhausted on delivery record
    const effectiveMax = maxAttempts ?? 3;
    if (existing && existing.attemptCount >= effectiveMax) {
      return {
        success: false,
        errorCategory: "PERMANENT",
        errorMessage: `Delivery attempt count ${existing.attemptCount} has exceeded maximum allowed ${effectiveMax}.`,
        retryable: false,
      };
    }

    // Attempt delivery retry
    const retryResult = await retryNotificationDelivery(targetId, channel, supabase);

    if (retryResult.status === "UNAVAILABLE") {
      // Unintegrated external providers are permanently unavailable in current environment
      return {
        success: false,
        errorCategory: "PERMANENT",
        errorMessage: `Channel ${channel || existing?.channel} is unavailable in current environment.`,
        retryable: false,
      };
    }

    if (!retryResult.success) {
      const isRetryable = context.attemptCount < context.maxAttempts;
      return {
        success: false,
        errorCategory: isRetryable ? "TRANSIENT" : "PERMANENT",
        errorMessage: retryResult.error || "Retry attempt failed",
        retryable: isRetryable,
      };
    }

    return {
      success: true,
      result: {
        status: retryResult.status,
        attemptCount: retryResult.attemptCount,
      },
    };
  }
}
