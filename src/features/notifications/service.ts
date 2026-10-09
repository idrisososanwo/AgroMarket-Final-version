/**
 * AgroMarket Phase 3.16: Unified Notification Service
 * Orchestrates multi-channel delivery and agricultural intelligence alert pipelines.
 * Preserves 100% backward compatibility with existing platform callers.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  IngestAlertEventParams,
  IngestAlertResult,
  UserNotificationItem,
  NotificationQueryFilters,
  DeliveryChannel,
} from "./types";
import { ingestAlertEvent } from "./alert-pipeline";
import {
  fetchUserNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  acknowledgeNotification,
  dismissNotification,
  insertNotificationRecord,
  insertDeliveryRecord,
} from "./data-layer";
import { getDeliveryProvider } from "./delivery-providers";
import { assertNoProhibitedProduceNotification } from "./validation";

export interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: DeliveryChannel;
  actionUrl?: string;
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  private static getAdminClientSafely() {
    if (
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
      try {
        return createAdminClient();
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Dispatches an in-app and multi-channel notification to a single user.
   * Preserves backward compatibility with Phase 0.2, disputes, and settlements callers.
   */
  static async sendNotification(params: SendNotificationParams): Promise<string> {
    assertNoProhibitedProduceNotification(params.title, "Notification Title");
    assertNoProhibitedProduceNotification(params.message, "Notification Body");

    const channel: DeliveryChannel = params.channel || "IN_APP";
    const now = new Date().toISOString();
    const notificationId = crypto.randomUUID();

    const notificationItem: UserNotificationItem = {
      id: notificationId,
      userId: params.userId,
      type: params.type,
      channel,
      title: params.title,
      body: params.message,
      actionUrl: params.actionUrl || null,
      isRead: false,
      severity: params.severity || "INFO",
      metadata: params.metadata || {},
      createdAt: now,
    };

    const adminClient = this.getAdminClientSafely();

    await insertNotificationRecord(adminClient, notificationItem);

    // Execute channel delivery and record delivery state
    const provider = getDeliveryProvider(channel);
    const deliveryResult = await provider.send({
      notificationId,
      userId: params.userId,
      channel,
      title: params.title,
      body: params.message,
      message: params.message,
      metadata: params.metadata,
    });

    await insertDeliveryRecord(adminClient, {
      id: crypto.randomUUID(),
      notificationId,
      userId: params.userId,
      channel,
      deliveryStatus: deliveryResult.status,
      attemptCount: deliveryResult.attemptCount,
      lastAttemptAt: now,
      deliveredAt: deliveryResult.deliveredAt,
      errorCode: deliveryResult.errorCode,
      errorMessage: deliveryResult.errorMessage,
      providerResponse: deliveryResult.providerResponse,
      createdAt: now,
    });

    return notificationId;
  }

  /**
   * Publishes an agricultural intelligence alert through the governed pipeline.
   */
  static async publishIntelligenceAlert(
    params: IngestAlertEventParams
  ): Promise<IngestAlertResult> {
    const adminClient = this.getAdminClientSafely();
    return ingestAlertEvent(params, { supabase: adminClient });
  }

  /**
   * Retrieves notifications for a user with structured filters.
   */
  static async getUserNotifications(
    userId: string,
    filters?: NotificationQueryFilters
  ): Promise<UserNotificationItem[]> {
    const adminClient = this.getAdminClientSafely();
    return fetchUserNotifications(adminClient, userId, filters);
  }

  /**
   * Returns unread count for user badges.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const adminClient = this.getAdminClientSafely();
    return fetchUnreadNotificationCount(adminClient, userId);
  }

  /**
   * Marks a notification as read. Accepts either (notificationId, userId) or (userId, notificationId).
   */
  static async markAsRead(first: string, second: string): Promise<boolean> {
    const adminClient = this.getAdminClientSafely();
    const res1 = await markNotificationAsRead(adminClient, first, second);
    if (res1) return true;
    return markNotificationAsRead(adminClient, second, first);
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    const adminClient = this.getAdminClientSafely();
    return markAllNotificationsAsRead(adminClient, userId);
  }

  /**
   * Acknowledges a notification. Accepts either (notificationId, userId) or (userId, notificationId).
   */
  static async acknowledge(first: string, second: string): Promise<boolean> {
    const adminClient = this.getAdminClientSafely();
    const res1 = await acknowledgeNotification(adminClient, first, second);
    if (res1) return true;
    return acknowledgeNotification(adminClient, second, first);
  }

  /**
   * Dismisses a notification. Accepts either (notificationId, userId) or (userId, notificationId).
   */
  static async dismiss(first: string, second: string): Promise<boolean> {
    const adminClient = this.getAdminClientSafely();
    const res1 = await dismissNotification(adminClient, first, second);
    if (res1) return true;
    return dismissNotification(adminClient, second, first);
  }
}
