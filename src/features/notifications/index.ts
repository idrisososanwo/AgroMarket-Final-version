/**
 * Notifications Domain Boundary
 * Multi-channel dispatch (SMS, WhatsApp, push notifications, email) adapted for low-connectivity environments.
 */
export interface NotificationPayload {
  userId: string;
  channel: "SMS" | "WHATSAPP" | "EMAIL" | "PUSH" | "IN_APP";
  title: string;
  message: string;
}
