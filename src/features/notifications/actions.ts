"use server";

/**
 * AgroMarket Phase 3.16: Notifications Server Actions
 * Governed server actions for alert publishing and user notification management.
 */

import { getCurrentUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  UserNotificationItem,
  NotificationQueryFilters,
  IngestAlertEventParams,
  IngestAlertResult,
} from "./types";
import {
  notificationQueryFiltersSchema,
  ingestAlertEventSchema,
  assertNoProhibitedProduceNotification,
} from "./validation";
import {
  fetchUserNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  acknowledgeNotification,
  dismissNotification,
} from "./data-layer";
import { ingestAlertEvent, approveAndPublishAlert } from "./alert-pipeline";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Fetches notifications for the currently authenticated user.
 */
export async function getUserNotificationsAction(
  filters: NotificationQueryFilters = { limit: 20, offset: 0 }
): Promise<ActionResult<UserNotificationItem[]>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  const parsed = notificationQueryFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  try {
    const supabase = await createClient();
    const data = await fetchUserNotifications(supabase, user.id, parsed.data);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch notifications.",
      code: "FETCH_FAILED",
    };
  }
}

/**
 * Fetches unread notification count for the currently authenticated user.
 */
export async function getUnreadNotificationCountAction(): Promise<ActionResult<number>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  try {
    const supabase = await createClient();
    const count = await fetchUnreadNotificationCount(supabase, user.id);
    return { success: true, data: count };
  } catch {
    return { success: false, error: "Failed to retrieve unread count.", code: "COUNT_FAILED" };
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<boolean>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  try {
    const supabase = await createClient();
    const success = await markNotificationAsRead(supabase, notificationId, user.id);
    return { success, data: success };
  } catch {
    return { success: false, error: "Failed to mark as read.", code: "UPDATE_FAILED" };
  }
}

/**
 * Marks all notifications as read for current user.
 */
export async function markAllNotificationsReadAction(): Promise<ActionResult<boolean>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  try {
    const supabase = await createClient();
    const success = await markAllNotificationsAsRead(supabase, user.id);
    return { success, data: success };
  } catch {
    return { success: false, error: "Failed to mark all as read.", code: "UPDATE_FAILED" };
  }
}

/**
 * Acknowledges an alert notification.
 */
export async function acknowledgeNotificationAction(
  notificationId: string
): Promise<ActionResult<boolean>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  try {
    const supabase = await createClient();
    const success = await acknowledgeNotification(supabase, notificationId, user.id);
    return { success, data: success };
  } catch {
    return { success: false, error: "Failed to acknowledge notification.", code: "UPDATE_FAILED" };
  }
}

/**
 * Dismisses a notification from user list.
 */
export async function dismissNotificationAction(
  notificationId: string
): Promise<ActionResult<boolean>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  try {
    const supabase = await createClient();
    const success = await dismissNotification(supabase, notificationId, user.id);
    return { success, data: success };
  } catch {
    return { success: false, error: "Failed to dismiss notification.", code: "UPDATE_FAILED" };
  }
}

/**
 * Publishes an agricultural intelligence alert through the governed pipeline.
 * Server-authorized: Requires administrative or expert coordinator permissions.
 */
export async function publishIntelligenceAlertAction(
  params: IngestAlertEventParams
): Promise<ActionResult<IngestAlertResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  const isAuthorized = user.roles.some((r) =>
    ["ADMIN", "SUPER_ADMIN", "EXPERT", "COORDINATOR"].includes(r)
  );

  if (!isAuthorized) {
    return {
      success: false,
      error: "Forbidden: Only authorized coordinators can publish intelligence alerts.",
      code: "FORBIDDEN",
    };
  }

  // 1. Zod schema validation & anti-pork assertion
  const parsed = ingestAlertEventSchema.safeParse(params);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  try {
    assertNoProhibitedProduceNotification(parsed.data.title, "Alert Title");
    assertNoProhibitedProduceNotification(parsed.data.summary, "Alert Summary");
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Prohibited produce detected.",
      code: "ANTI_PORK_VIOLATION",
    };
  }

  // 2. Evaluate Governance Policy
  const govResult = evaluateGovernancePolicy({
    actorRole: user.roles[0] || "COORDINATOR",
    actionIntent: "VIEW_MARKETPLACE",
    agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
    domain: "AGRICULTURAL_COORDINATION",
    confidenceScore: parsed.data.confidenceScore ?? 0.85,
  });

  if (govResult.decision === "DENY") {
    return {
      success: false,
      error: `Governance Denied: ${govResult.reasons.join(", ")}`,
      code: "GOVERNANCE_DENIED",
    };
  }

  try {
    const supabase = await createClient();
    const result = await ingestAlertEvent(parsed.data, {
      supabase,
      actorRole: user.roles[0],
      skipGovernanceCheck: false,
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish alert.",
      code: "PUBLISH_FAILED",
    };
  }
}

/**
 * Approves a previously held pending review alert.
 */
export async function approvePendingAlertAction(
  alertId: string
): Promise<ActionResult<{ dispatchedCount: number }>> {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ADMIN")) {
    return { success: false, error: "Forbidden: Admin approval required.", code: "FORBIDDEN" };
  }

  try {
    const supabase = await createClient();
    const result = await approveAndPublishAlert(alertId, user.id, supabase);
    if (!result.success) {
      return { success: false, error: result.error, code: "APPROVAL_FAILED" };
    }
    return { success: true, data: { dispatchedCount: result.dispatchedCount } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Approval failed.",
      code: "APPROVAL_ERROR",
    };
  }
}
