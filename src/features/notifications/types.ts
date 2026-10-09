/**
 * AgroMarket Phase 3.16: Agricultural Intelligence Notifications & Alert Delivery Foundation
 * Domain Contracts, Types, Interfaces, and State Enums
 *
 * SAFETY INVARIANTS:
 * - Separates Alert Definition, Publication Decision, User Receipt State, and Delivery State.
 * - Enforces explicit Delivery Status (never fakes external transmission).
 * - Preserves Provenance, Confidence, and Temporal Validity on alerts.
 * - Anti-Pork Zero Tolerance across titles, messages, and payloads.
 */

import { KnowledgeProvenance, KnowledgeConfidence } from "@/features/knowledge-graph/types";
import { ActorRole } from "@/features/decision-intelligence/types";
import { NigerianState } from "@/features/marketplace/constants";

// -----------------------------------------------------------------------------
// 1. NOTIFICATION CATEGORIES & SEVERITY
// -----------------------------------------------------------------------------

export const NOTIFICATION_CATEGORIES = [
  "PRICE_CHANGE",
  "DEMAND_OPPORTUNITY",
  "SUPPLY_OPPORTUNITY",
  "PRODUCTION_GUIDANCE",
  "DISEASE_BIOSECURITY_ADVISORY",
  "FOOD_SECURITY_ALERT",
  "FULFILMENT_LOGISTICS_UPDATE",
  "PROCESSING_UPDATE",
  "GOVERNMENT_ANNOUNCEMENT",
  "EVENT_TRAINING",
  "COORDINATION_EVENT",
  "SYSTEM_NOTICE",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const ALERT_SEVERITIES = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_PUBLICATION_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "WITHHELD",
  "EXPIRED",
] as const;

export type AlertPublicationStatus = (typeof ALERT_PUBLICATION_STATUSES)[number];

// -----------------------------------------------------------------------------
// 2. DELIVERY CHANNELS & STATES
// -----------------------------------------------------------------------------

export const DELIVERY_CHANNELS = [
  "IN_APP",
  "SMS",
  "WHATSAPP",
  "EMAIL",
  "PUSH",
] as const;

export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export const DELIVERY_STATUSES = [
  "QUEUED",
  "ATTEMPTED",
  "ACCEPTED",
  "DELIVERED",
  "FAILED",
  "UNAVAILABLE",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// -----------------------------------------------------------------------------
// 3. TARGET AUDIENCE & RELEVANCE
// -----------------------------------------------------------------------------

export type AudienceRole = ActorRole | "COORDINATOR";

export interface TargetAudience {
  roles?: AudienceRole[];
  states?: (NigerianState | string)[];
  lgas?: string[];
  commodities?: string[];
  minUrgency?: AlertSeverity;
}

export interface NotificationQueryFilters {
  isRead?: boolean;
  category?: NotificationCategory;
  severity?: AlertSeverity;
  channel?: DeliveryChannel;
  limit?: number;
  offset?: number;
}

// -----------------------------------------------------------------------------
// 4. AGRICULTURAL INTELLIGENCE ALERT (Canonical Alert Entity)
// -----------------------------------------------------------------------------

export interface AgriculturalIntelligenceAlert {
  id: string;
  category: NotificationCategory;
  severity: AlertSeverity;
  title: string;
  summary: string;
  sourceEntityType: string;
  sourceReference: string;
  sourceProvenance: KnowledgeProvenance;
  confidenceLevel: KnowledgeConfidence;
  confidenceScore?: number | null;
  validFrom?: string | null;
  expiresAt?: string | null;
  isHistorical: boolean;
  hasConflicts: boolean;
  conflictExplanation?: string | null;
  targetAudience: TargetAudience;
  publicationStatus: AlertPublicationStatus;
  requiresHumanReview: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  deduplicationKey?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 5. USER NOTIFICATION RECEIPT (In-App User State)
// -----------------------------------------------------------------------------

export interface UserNotificationItem {
  id: string;
  userId: string;
  alertId?: string | null;
  type: NotificationCategory | string;
  channel: DeliveryChannel;
  title: string;
  body: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  acknowledgedAt?: string | null;
  dismissedAt?: string | null;
  severity: AlertSeverity;
  expiresAt?: string | null;
  idempotencyKey?: string | null;
  sourceReference?: string | null;
  sourceSystem?: string | null;
  confidence?: number | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  alert?: AgriculturalIntelligenceAlert | null;
}

// -----------------------------------------------------------------------------
// 6. DELIVERY RECORD (Channel-Specific Delivery Log)
// -----------------------------------------------------------------------------

export interface NotificationDeliveryRecord {
  id: string;
  notificationId: string;
  alertId?: string | null;
  userId: string;
  channel: DeliveryChannel;
  deliveryStatus: DeliveryStatus;
  attemptCount: number;
  lastAttemptAt: string;
  deliveredAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  providerResponse?: Record<string, unknown>;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 7. USER ALERT PREFERENCES
// -----------------------------------------------------------------------------

export interface NotificationPreferences {
  userId: string;
  enabledCategories: NotificationCategory[];
  severityThreshold: AlertSeverity;
  minimumSeverity?: AlertSeverity;
  enabledChannels: DeliveryChannel[];
  preferredStates: string[];
  monitoredStates?: string[];
  preferredLgas: string[];
  monitoredCommodities: string[];
  quietHoursEnabled: boolean;
  quietHoursStartUtc?: string; // HH:MM
  quietHoursEndUtc?: string; // HH:MM
  optedOutCategories: NotificationCategory[];
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 8. PIPELINE INPUT & RESULT
// -----------------------------------------------------------------------------

export interface CandidateUser {
  userId: string;
  role?: string;
  roles?: (AudienceRole | string)[];
  state?: string | null;
  lga?: string | null;
  preferences?: (Partial<NotificationPreferences> & {
    minimumSeverity?: AlertSeverity;
    monitoredStates?: string[];
  }) | Record<string, unknown> | null;
}

export type IngestAlertEventInput = IngestAlertEventParams;

export interface IngestAlertEventParams {
  category: NotificationCategory;
  severity: AlertSeverity;
  title: string;
  message?: string;
  summary?: string;
  commodityName?: string;
  sourceEntityType?: string;
  sourceReference?: string;
  sourceSystem?: string;
  sourceProvenance?: KnowledgeProvenance;
  confidence?: number;
  confidenceLevel?: KnowledgeConfidence;
  confidenceScore?: number;
  validFrom?: string;
  validUntil?: string;
  expiresAt?: string;
  isHistorical?: boolean;
  hasConflicts?: boolean;
  conflictExplanation?: string;
  targetAudience?: TargetAudience;
  deduplicationKey?: string;
  idempotencyKey?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestAlertResult {
  success: boolean;
  alertId: string;
  alert: AgriculturalIntelligenceAlert;
  notificationsCreated: number;
  dispatchedNotificationCount: number;
  recipientUserIds: string[];
  publicationStatus: AlertPublicationStatus;
  requiresHumanReview: boolean;
  heldForReview: boolean;
  deduplicated: boolean;
  reason?: string;
}

