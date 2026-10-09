/**
 * AgroMarket Phase 3.16: Agricultural Intelligence Notifications Constants
 */

import { AlertSeverity, NotificationCategory, DeliveryChannel } from "./types";

export const MAX_NOTIFICATION_TITLE_LENGTH = 150;
export const MAX_NOTIFICATION_BODY_LENGTH = 1000;
export const MAX_DELIVERY_RETRIES = 3;

// Severity rank for threshold comparisons: INFO < LOW < MEDIUM < HIGH < CRITICAL
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// Default validity periods in hours by severity level
export const DEFAULT_ALERT_VALIDITY_HOURS: Record<AlertSeverity, number> = {
  CRITICAL: 72,      // 3 days
  HIGH: 168,         // 7 days
  MEDIUM: 336,       // 14 days
  LOW: 720,          // 30 days
  INFO: 720,         // 30 days
};

// Safe error classifications
export const NOTIFICATION_ERROR_CODES = {
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_RECIPIENT: "INVALID_RECIPIENT",
  NETWORK_FAILURE: "NETWORK_FAILURE",
  GOVERNANCE_BLOCKED: "GOVERNANCE_BLOCKED",
  STALE_EVENT: "STALE_EVENT",
  ANTI_PORK_VIOLATION: "ANTI_PORK_VIOLATION",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type NotificationErrorCode =
  (typeof NOTIFICATION_ERROR_CODES)[keyof typeof NOTIFICATION_ERROR_CODES];

// Categories that require mandatory coordinator / expert review when severity is HIGH or CRITICAL
export const REVIEW_REQUIRED_HIGH_SEVERITY_CATEGORIES: NotificationCategory[] = [
  "DISEASE_BIOSECURITY_ADVISORY",
  "FOOD_SECURITY_ALERT",
];

// Default available channels (In-app is enabled by default; external channels unconfigured)
export const CONFIGURED_DELIVERY_CHANNELS: Record<DeliveryChannel, boolean> = {
  IN_APP: true,
  SMS: false,
  WHATSAPP: false,
  EMAIL: false,
  PUSH: false,
};

// Quiet hours defaults in UTC (10:00 PM to 6:00 AM West Africa Time = 21:00 to 05:00 UTC)
export const DEFAULT_QUIET_HOURS_START_UTC = "21:00";
export const DEFAULT_QUIET_HOURS_END_UTC = "05:00";
