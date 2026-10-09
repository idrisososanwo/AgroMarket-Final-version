/**
 * AgroMarket Agricultural Intelligence Notifications & Alert Delivery Foundation (Phase 3.16)
 * Multi-channel dispatch (In-App live, honest UNAVAILABLE external fallback).
 * Grounded agricultural intelligence alerts, biosecurity advisories, and price signals.
 */

export * from "./types";
export * from "./constants";
export * from "./validation";
export * from "./delivery-providers";
export * from "./audience-matcher";
export * from "./data-layer";
export * from "./alert-pipeline";
export * from "./service";
export * from "./actions";
export * from "./components";

// Preserved for legacy compatibility:
export interface NotificationPayload {
  userId: string;
  channel: "SMS" | "WHATSAPP" | "EMAIL" | "PUSH" | "IN_APP";
  title: string;
  message: string;
}
