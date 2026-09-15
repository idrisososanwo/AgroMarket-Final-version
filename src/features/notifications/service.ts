import { createAdminClient } from "@/lib/supabase/admin";

export interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: "IN_APP" | "SMS" | "EMAIL" | "PUSH" | "WHATSAPP";
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Dispatches an in-app and multi-channel notification to a user.
   * Silently logs failure without throwing to prevent blocking business operations.
   */
  static async sendNotification(params: SendNotificationParams): Promise<void> {
    try {
      const admin = createAdminClient();
      await admin.from("notifications").insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        channel: params.channel || "IN_APP",
        metadata: params.metadata || {},
      });
    } catch (error) {
      console.error("Failed to persist notification:", error);
    }
  }
}
