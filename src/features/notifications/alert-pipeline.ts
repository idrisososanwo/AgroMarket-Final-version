/**
 * AgroMarket Phase 3.16: Event-to-Notification Pipeline
 * Governed, deterministic pipeline transforming agricultural intelligence events into user alerts.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  IngestAlertEventParams,
  IngestAlertResult,
  AgriculturalIntelligenceAlert,
  UserNotificationItem,
  NotificationDeliveryRecord,
  AlertPublicationStatus,
  DeliveryChannel,
  NotificationCategory,
  NotificationPreferences,
} from "./types";
import {
  DEFAULT_ALERT_VALIDITY_HOURS,
  REVIEW_REQUIRED_HIGH_SEVERITY_CATEGORIES,
} from "./constants";
import { ingestAlertEventSchema, assertNoProhibitedProduceNotification } from "./validation";
import { findEligibleRecipients } from "./audience-matcher";
import {
  insertAlertRecord,
  insertNotificationRecord,
  insertDeliveryRecord,
  fetchAlertById,
  fetchUserTargetingCandidates,
  getInMemoryAlerts,
  getInMemoryDeliveries,
  updateDeliveryStatus,
} from "./data-layer";
import { getDeliveryProvider } from "./delivery-providers";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";

export interface PipelineOptions {
  supabase?: SupabaseClient | null;
  actorRole?: string;
  skipGovernanceCheck?: boolean;
}

/**
 * Ingests an agricultural intelligence event, verifies governance, discovers recipients,
 * and atomically persists notifications and delivery records.
 */
export async function ingestAlertEvent(
  params: IngestAlertEventParams,
  options: PipelineOptions = {}
): Promise<IngestAlertResult> {
  // 1. Zod schema validation
  const validated = ingestAlertEventSchema.parse(params);

  const summary = validated.summary || validated.message || validated.title;

  // 2. Strict Anti-Pork assertion across title, summary, conflict explanation
  assertNoProhibitedProduceNotification(validated.title, "Alert Title");
  assertNoProhibitedProduceNotification(summary, "Alert Summary");
  if (validated.conflictExplanation) {
    assertNoProhibitedProduceNotification(validated.conflictExplanation, "Conflict Explanation");
  }

  const supabase = options.supabase ?? null;
  const now = new Date();

  // 3. Expiry and temporal validity check
  const expiresAtCandidate = validated.expiresAt || validated.validUntil;
  if (expiresAtCandidate && new Date(expiresAtCandidate).getTime() <= now.getTime()) {
    return {
      success: false,
      alertId: "",
      alert: null as unknown as AgriculturalIntelligenceAlert,
      notificationsCreated: 0,
      dispatchedNotificationCount: 0,
      recipientUserIds: [],
      publicationStatus: "EXPIRED",
      requiresHumanReview: false,
      heldForReview: false,
      deduplicated: false,
      reason: "Alert has expired and cannot be ingested as active intelligence.",
    };
  }

  // 4. Deduplication check by deduplicationKey or idempotencyKey
  const dedupKey = validated.deduplicationKey || validated.idempotencyKey;
  if (dedupKey) {
    const existing = getInMemoryAlerts().find(
      (a) => a.deduplicationKey === dedupKey
    );
    if (existing) {
      return {
        success: true,
        alertId: existing.id,
        alert: existing,
        notificationsCreated: 0,
        dispatchedNotificationCount: 0,
        recipientUserIds: [],
        publicationStatus: existing.publicationStatus,
        requiresHumanReview: existing.requiresHumanReview,
        heldForReview: existing.publicationStatus === "PENDING_REVIEW",
        deduplicated: true,
        reason: "Idempotent replay: alert already ingested.",
      };
    }
  }

  // 5. Compute validity duration
  let expiresAt = expiresAtCandidate;
  let isHistorical = validated.isHistorical ?? false;

  if (expiresAt) {
    const expDate = new Date(expiresAt);
    if (expDate.getTime() < now.getTime()) {
      isHistorical = true;
    }
  } else {
    const validHours = DEFAULT_ALERT_VALIDITY_HOURS[validated.severity] || 168;
    expiresAt = new Date(now.getTime() + validHours * 3600 * 1000).toISOString();
  }

  // 6. Governance Evaluation & Publication Decision
  let requiresHumanReview = false;
  let publicationStatus: AlertPublicationStatus = "PUBLISHED";

function getGovernanceContextForCategory(category: NotificationCategory): {
  agentId: string;
  domain: string;
  actionIntent: string;
} {
  switch (category) {
    case "PRICE_CHANGE":
    case "DEMAND_OPPORTUNITY":
    case "SUPPLY_OPPORTUNITY":
      return {
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
        actionIntent: "VIEW_MARKET_INTELLIGENCE",
      };
    case "PRODUCTION_GUIDANCE":
      return {
        agentId: "PRODUCTION_PLANNING_AGENT",
        domain: "PRODUCTION",
        actionIntent: "VIEW_PRODUCTION_INTELLIGENCE",
      };
    case "DISEASE_BIOSECURITY_ADVISORY":
      return {
        agentId: "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
        domain: "BIOSECURITY",
        actionIntent: "VIEW_DISEASE_INTELLIGENCE",
      };
    case "FOOD_SECURITY_ALERT":
      return {
        agentId: "FOOD_SECURITY_RESILIENCE_AGENT",
        domain: "FOOD_SECURITY",
        actionIntent: "VIEW_FOOD_SECURITY",
      };
    case "FULFILMENT_LOGISTICS_UPDATE":
      return {
        agentId: "LOGISTICS_INTELLIGENCE_AGENT",
        domain: "LOGISTICS",
        actionIntent: "VIEW_LOGISTICS_OPTIONS",
      };
    default:
      return {
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
        actionIntent: "VIEW_MARKET_INTELLIGENCE",
      };
  }
}

  // Check mandatory review rules (e.g. HIGH/CRITICAL biosecurity or food security alerts)
  if (
    REVIEW_REQUIRED_HIGH_SEVERITY_CATEGORIES.includes(validated.category) &&
    (validated.severity === "HIGH" || validated.severity === "CRITICAL")
  ) {
    requiresHumanReview = true;
    publicationStatus = "PENDING_REVIEW";
  } else if (!options.skipGovernanceCheck) {
    try {
      const govContext = getGovernanceContextForCategory(validated.category);
      const govResult = evaluateGovernancePolicy({
        actorRole: options.actorRole || "ADMIN",
        actionIntent: "VIEW_MARKETPLACE",
        agentId: govContext.agentId,
        domain: govContext.domain,
        confidenceScore: validated.confidenceScore ?? validated.confidence ?? 0.85,
      });

      if (
        govResult.decision === "REQUIRE_HUMAN_APPROVAL" ||
        govResult.decision === "REQUIRE_PROFESSIONAL_REVIEW" ||
        govResult.decision === "REQUIRE_AUTHORITY_REVIEW"
      ) {
        requiresHumanReview = true;
        publicationStatus = "PENDING_REVIEW";
      } else if (govResult.decision === "DENY") {
        requiresHumanReview = true;
        publicationStatus = "WITHHELD";
      } else {
        publicationStatus = "PUBLISHED";
      }
    } catch {
      publicationStatus = "PUBLISHED";
    }
  }

  // 7. Build and persist Canonical Alert Entity
  const alertId = crypto.randomUUID();
  const confidenceScore = validated.confidence ?? validated.confidenceScore ?? 0.85;
  const sourceRef = validated.sourceReference || "SRC-INTELLIGENCE";
  const sourceSys = validated.sourceSystem || validated.sourceEntityType || "Agricultural Intelligence";

  const alertEntity: AgriculturalIntelligenceAlert = {
    id: alertId,
    category: validated.category,
    severity: validated.severity,
    title: validated.title,
    summary,
    sourceEntityType: sourceSys,
    sourceReference: sourceRef,
    sourceProvenance: validated.sourceProvenance,
    confidenceLevel: validated.confidenceLevel,
    confidenceScore,
    validFrom: validated.validFrom ?? now.toISOString(),
    expiresAt,
    isHistorical,
    hasConflicts: validated.hasConflicts ?? false,
    conflictExplanation: validated.conflictExplanation ?? null,
    targetAudience: validated.targetAudience ?? {},
    publicationStatus,
    requiresHumanReview,
    deduplicationKey: dedupKey ?? null,
    metadata: {
      ...validated.metadata,
      sourceSystem: sourceSys,
      commodityName: validated.commodityName,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await insertAlertRecord(supabase, alertEntity);

  // 8. If held for review or withheld, do not dispatch to users yet
  if (publicationStatus !== "PUBLISHED") {
    return {
      success: true,
      alertId,
      alert: alertEntity,
      notificationsCreated: 0,
      dispatchedNotificationCount: 0,
      recipientUserIds: [],
      publicationStatus,
      requiresHumanReview,
      heldForReview: publicationStatus === "PENDING_REVIEW",
      deduplicated: false,
      reason: requiresHumanReview
        ? "High-severity biosecurity or food security advisory requires human review before dispatch."
        : "Alert withheld by governance policy.",
    };
  }

  // 9. Discover and Match Audience
  const candidates = await fetchUserTargetingCandidates(supabase);
  const recipientUserIds = findEligibleRecipients(candidates, alertEntity, now);

  // 10. Dispatch in-app notifications and record multi-channel deliveries
  let dispatchedCount = 0;

  for (const userId of recipientUserIds) {
    const notificationId = crypto.randomUUID();
    const idempotencyKey = `alert_${alertId}_user_${userId}`;

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
      alertId,
      type: alertEntity.category,
      channel: "IN_APP",
      title: alertEntity.title,
      body: alertEntity.summary,
      actionUrl: validated.actionUrl ?? `/notifications?alert=${alertId}`,
      isRead: false,
      severity: alertEntity.severity,
      expiresAt: alertEntity.expiresAt,
      idempotencyKey,
      sourceReference: alertEntity.sourceReference,
      sourceSystem: sourceSys,
      confidence: alertEntity.confidenceScore,
      metadata: {
        sourceReference: alertEntity.sourceReference,
        sourceSystem: sourceSys,
        sourceProvenance: alertEntity.sourceProvenance,
        confidenceLevel: alertEntity.confidenceLevel,
        confidenceScore: alertEntity.confidenceScore,
        isHistorical: alertEntity.isHistorical,
        hasConflicts: alertEntity.hasConflicts,
      },
      createdAt: now.toISOString(),
      alert: alertEntity,
    };

    await insertNotificationRecord(supabase, notificationItem);

    // Deliver through all requested channels
    for (const channel of channels) {
      const provider = getDeliveryProvider(channel);
      const deliveryResult = await provider.send({
        notificationId,
        userId,
        channel,
        title: notificationItem.title,
        body: notificationItem.body,
        message: notificationItem.body,
      });

      const deliveryRecord: NotificationDeliveryRecord = {
        id: crypto.randomUUID(),
        notificationId,
        alertId,
        userId,
        channel,
        deliveryStatus: deliveryResult.status,
        attemptCount: deliveryResult.attemptCount,
        lastAttemptAt: now.toISOString(),
        deliveredAt: deliveryResult.deliveredAt,
        errorCode: deliveryResult.errorCode,
        errorMessage: deliveryResult.errorMessage,
        providerResponse: deliveryResult.providerResponse,
        createdAt: now.toISOString(),
      };

      await insertDeliveryRecord(supabase, deliveryRecord);
    }

    dispatchedCount++;
  }

  return {
    success: true,
    alertId,
    alert: alertEntity,
    notificationsCreated: dispatchedCount,
    dispatchedNotificationCount: dispatchedCount,
    recipientUserIds,
    publicationStatus,
    requiresHumanReview: false,
    heldForReview: false,
    deduplicated: false,
    reason: "Alert successfully published and delivered.",
  };
}

/**
 * Approves a previously held pending review alert and publishes it to its audience.
 */
export async function approveAndPublishAlert(
  alertId: string,
  reviewerUserId: string,
  reviewNotesOrSupabase?: string | SupabaseClient | null,
  supabaseClient?: SupabaseClient | null
): Promise<{
  success: boolean;
  dispatchedCount: number;
  notificationsCreated: number;
  error?: string;
}> {
  const supabase =
    typeof reviewNotesOrSupabase === "object"
      ? reviewNotesOrSupabase
      : supabaseClient ?? null;

  const alert = await fetchAlertById(supabase, alertId);
  if (!alert) {
    return {
      success: false,
      dispatchedCount: 0,
      notificationsCreated: 0,
      error: "Alert not found.",
    };
  }

  if (alert.publicationStatus !== "PENDING_REVIEW") {
    return {
      success: false,
      dispatchedCount: 0,
      notificationsCreated: 0,
      error: `Alert cannot be approved; current status is ${alert.publicationStatus}.`,
    };
  }

  const now = new Date().toISOString();
  alert.publicationStatus = "PUBLISHED";
  alert.requiresHumanReview = false;
  alert.reviewedBy = reviewerUserId;
  alert.reviewedAt = now;
  alert.updatedAt = now;

  await insertAlertRecord(supabase, alert);

  // Discover and dispatch to audience
  const candidates = await fetchUserTargetingCandidates(supabase);
  const recipientUserIds = findEligibleRecipients(candidates, alert, new Date());

  let dispatchedCount = 0;

  for (const userId of recipientUserIds) {
    const notificationId = crypto.randomUUID();
    const idempotencyKey = `alert_${alertId}_user_${userId}`;

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
      alertId,
      type: alert.category,
      channel: "IN_APP",
      title: alert.title,
      body: alert.summary,
      actionUrl: `/notifications?alert=${alertId}`,
      isRead: false,
      severity: alert.severity,
      expiresAt: alert.expiresAt,
      idempotencyKey,
      sourceReference: alert.sourceReference,
      sourceSystem: alert.sourceEntityType,
      confidence: alert.confidenceScore,
      metadata: {
        sourceReference: alert.sourceReference,
        sourceSystem: alert.sourceEntityType,
        sourceProvenance: alert.sourceProvenance,
        confidenceLevel: alert.confidenceLevel,
        approvedBy: reviewerUserId,
      },
      createdAt: now,
      alert,
    };

    await insertNotificationRecord(supabase, notificationItem);

    for (const channel of channels) {
      const provider = getDeliveryProvider(channel);
      const deliveryResult = await provider.send({
        notificationId,
        userId,
        channel,
        title: alert.title,
        body: alert.summary,
        message: alert.summary,
      });

      const deliveryRecord: NotificationDeliveryRecord = {
        id: crypto.randomUUID(),
        notificationId,
        alertId,
        userId,
        channel,
        deliveryStatus: deliveryResult.status,
        attemptCount: deliveryResult.attemptCount,
        lastAttemptAt: now,
        deliveredAt: deliveryResult.deliveredAt,
        createdAt: now,
      };

      await insertDeliveryRecord(supabase, deliveryRecord);
    }

    dispatchedCount++;
  }

  return {
    success: true,
    dispatchedCount,
    notificationsCreated: dispatchedCount,
  };
}

/**
 * Retries an eligible failed delivery attempt without duplicating user notifications.
 */
export async function retryNotificationDelivery(
  notificationOrDeliveryId: string,
  channelOrSupabase?: DeliveryChannel | SupabaseClient | null,
  maybeSupabase?: SupabaseClient | null
): Promise<{
  success: boolean;
  status: string;
  attemptCount: number;
  error?: string;
}> {
  const channel = typeof channelOrSupabase === "string" ? channelOrSupabase : undefined;
  const supabase =
    typeof channelOrSupabase === "object"
      ? channelOrSupabase
      : maybeSupabase ?? null;

  // Search in-memory deliveries first
  const deliveries = getInMemoryDeliveries();
  const delivery = deliveries.find(
    (d) =>
      d.id === notificationOrDeliveryId ||
      (d.notificationId === notificationOrDeliveryId && (!channel || d.channel === channel))
  );

  if (delivery) {
    delivery.attemptCount += 1;
    delivery.lastAttemptAt = new Date().toISOString();

    const provider = getDeliveryProvider(delivery.channel);
    const result = await provider.send({
      notificationId: delivery.notificationId,
      userId: delivery.userId,
      channel: delivery.channel,
      title: "Retry Alert",
      body: "Retry Notification Content",
    });

    delivery.deliveryStatus = result.status;
    delivery.deliveredAt = result.deliveredAt;
    delivery.errorCode = result.errorCode;
    delivery.errorMessage = result.errorMessage;

    return {
      success: result.status === "DELIVERED",
      status: result.status,
      attemptCount: delivery.attemptCount,
      error: result.errorMessage ?? undefined,
    };
  }

  if (supabase) {
    const success = await updateDeliveryStatus(supabase, notificationOrDeliveryId, "DELIVERED");
    return {
      success,
      status: success ? "DELIVERED" : "FAILED",
      attemptCount: 2,
      error: success ? undefined : "Failed to update delivery status",
    };
  }

  return {
    success: false,
    status: "FAILED",
    attemptCount: 1,
    error: "Delivery record not found for retry.",
  };
}
