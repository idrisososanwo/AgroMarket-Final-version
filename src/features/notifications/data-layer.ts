/**
 * AgroMarket Phase 3.16: Notifications Data Access Layer
 * Supports Supabase database operations with resilient in-memory stores for unit testing.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  AgriculturalIntelligenceAlert,
  UserNotificationItem,
  NotificationDeliveryRecord,
  NotificationPreferences,
  NotificationQueryFilters,
  DeliveryStatus,
} from "./types";
import { UserTargetingContext } from "./audience-matcher";
import { ActorRole } from "@/features/decision-intelligence/types";

// -----------------------------------------------------------------------------
// 1. IN-MEMORY STORE (TEST SUITE & OFFLINE RESILIENCE)
// -----------------------------------------------------------------------------

const inMemoryAlerts = new Map<string, AgriculturalIntelligenceAlert>();
const inMemoryNotifications = new Map<string, UserNotificationItem>();
const inMemoryDeliveries = new Map<string, NotificationDeliveryRecord>();
const inMemoryPreferences = new Map<string, NotificationPreferences>();
const inMemoryCandidateUsers: UserTargetingContext[] = [];

export function resetInMemoryNotificationStore(): void {
  inMemoryAlerts.clear();
  inMemoryNotifications.clear();
  inMemoryDeliveries.clear();
  inMemoryPreferences.clear();
  inMemoryCandidateUsers.length = 0;
}

export function seedInMemoryCandidateUsers(candidates: UserTargetingContext[]): void {
  inMemoryCandidateUsers.length = 0;
  inMemoryCandidateUsers.push(...candidates);
}

export function getInMemoryNotifications(): UserNotificationItem[] {
  return Array.from(inMemoryNotifications.values());
}

export function getInMemoryDeliveries(): NotificationDeliveryRecord[] {
  return Array.from(inMemoryDeliveries.values());
}

export function getInMemoryAlerts(): AgriculturalIntelligenceAlert[] {
  return Array.from(inMemoryAlerts.values());
}

export function getInMemoryNotificationStore() {
  return {
    alerts: Array.from(inMemoryAlerts.values()),
    notifications: Array.from(inMemoryNotifications.values()),
    deliveries: Array.from(inMemoryDeliveries.values()),
    preferences: Array.from(inMemoryPreferences.values()),
  };
}

// -----------------------------------------------------------------------------
// 2. ALERT PERSISTENCE
// -----------------------------------------------------------------------------

export async function insertAlertRecord(
  supabase: SupabaseClient | null,
  alert: AgriculturalIntelligenceAlert
): Promise<AgriculturalIntelligenceAlert> {
  // Always register in memory store
  inMemoryAlerts.set(alert.id, alert);

  if (!supabase) return alert;

  try {
    const { error } = await supabase.from("agricultural_intelligence_alerts").insert({
      id: alert.id,
      category: alert.category,
      severity: alert.severity,
      title: alert.title,
      summary: alert.summary,
      source_entity_type: alert.sourceEntityType,
      source_reference: alert.sourceReference,
      source_provenance: alert.sourceProvenance,
      confidence_level: alert.confidenceLevel,
      confidence_score: alert.confidenceScore,
      valid_from: alert.validFrom,
      expires_at: alert.expiresAt,
      is_historical: alert.isHistorical,
      has_conflicts: alert.hasConflicts,
      conflict_explanation: alert.conflictExplanation,
      target_roles: alert.targetAudience.roles || [],
      target_states: alert.targetAudience.states || [],
      target_lgas: alert.targetAudience.lgas || [],
      target_commodities: alert.targetAudience.commodities || [],
      publication_status: alert.publicationStatus,
      requires_human_review: alert.requiresHumanReview,
      reviewed_by: alert.reviewedBy,
      reviewed_at: alert.reviewedAt,
      deduplication_key: alert.deduplicationKey,
      metadata: alert.metadata || {},
    });

    if (error) {
      console.warn("DB insertAlertRecord warning (in-memory preserved):", error.message);
    }
  } catch (err) {
    console.warn("Exception in insertAlertRecord:", err);
  }

  return alert;
}

export async function fetchAlertById(
  supabase: SupabaseClient | null,
  alertId: string
): Promise<AgriculturalIntelligenceAlert | null> {
  if (inMemoryAlerts.has(alertId)) {
    return inMemoryAlerts.get(alertId)!;
  }

  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("agricultural_intelligence_alerts")
      .select("*")
      .eq("id", alertId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      category: data.category,
      severity: data.severity,
      title: data.title,
      summary: data.summary,
      sourceEntityType: data.source_entity_type,
      sourceReference: data.source_reference,
      sourceProvenance: data.source_provenance,
      confidenceLevel: data.confidence_level,
      confidenceScore: data.confidence_score,
      validFrom: data.valid_from,
      expiresAt: data.expires_at,
      isHistorical: data.is_historical,
      hasConflicts: data.has_conflicts,
      conflictExplanation: data.conflict_explanation,
      targetAudience: {
        roles: data.target_roles,
        states: data.target_states,
        lgas: data.target_lgas,
        commodities: data.target_commodities,
      },
      publicationStatus: data.publication_status,
      requiresHumanReview: data.requires_human_review,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at,
      deduplicationKey: data.deduplication_key,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 3. USER NOTIFICATION PERSISTENCE & QUERIES
// -----------------------------------------------------------------------------

export async function insertNotificationRecord(
  supabase: SupabaseClient | null,
  item: UserNotificationItem
): Promise<UserNotificationItem> {
  // Always register in memory store
  inMemoryNotifications.set(item.id, item);

  if (!supabase) return item;

  try {
    const { error } = await supabase.from("notifications").insert({
      id: item.id,
      user_id: item.userId,
      alert_id: item.alertId || null,
      type: item.type,
      channel: item.channel,
      title: item.title,
      body: item.body,
      action_url: item.actionUrl || null,
      is_read: item.isRead,
      read_at: item.readAt || null,
      acknowledged_at: item.acknowledgedAt || null,
      dismissed_at: item.dismissedAt || null,
      severity: item.severity,
      expires_at: item.expiresAt || null,
      idempotency_key: item.idempotencyKey || null,
      metadata: item.metadata || {},
    });

    if (error) {
      console.warn("DB insertNotificationRecord warning (in-memory preserved):", error.message);
    }
  } catch (err) {
    console.warn("Exception in insertNotificationRecord:", err);
  }

  return item;
}

export async function fetchUserNotifications(
  supabase: SupabaseClient | null,
  userId: string,
  filters: NotificationQueryFilters = { limit: 20, offset: 0 }
): Promise<UserNotificationItem[]> {
  // Query from in-memory if populated
  const inMemoryList = Array.from(inMemoryNotifications.values())
    .filter((n) => n.userId === userId)
    .filter((n) => !n.dismissedAt); // Exclude dismissed

  let filtered = inMemoryList;
  if (filters.category) {
    filtered = filtered.filter((n) => n.type === filters.category);
  }
  if (filters.severity) {
    filtered = filtered.filter((n) => n.severity === filters.severity);
  }
  if (filters.isRead !== undefined) {
    filtered = filtered.filter((n) => n.isRead === filters.isRead);
  }
  if (filters.channel) {
    filtered = filtered.filter((n) => n.channel === filters.channel);
  }

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 20;

  if (filtered.length > 0 || !supabase) {
    return filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  if (!supabase) return [];

  try {
    let query = supabase
      .from("notifications")
      .select("*, agricultural_intelligence_alerts(*)")
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.category) {
      query = query.eq("type", filters.category);
    }
    if (filters.severity) {
      query = query.eq("severity", filters.severity);
    }
    if (filters.isRead !== undefined) {
      query = query.eq("is_read", filters.isRead);
    }
    if (filters.channel) {
      query = query.eq("channel", filters.channel);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      alertId: row.alert_id,
      type: row.type,
      channel: row.channel,
      title: row.title,
      body: row.body,
      actionUrl: row.action_url,
      isRead: row.is_read,
      readAt: row.read_at,
      acknowledgedAt: row.acknowledged_at,
      dismissedAt: row.dismissed_at,
      severity: row.severity || "INFO",
      expiresAt: row.expires_at,
      idempotencyKey: row.idempotency_key,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient | null,
  userId: string
): Promise<number> {
  const inMemoryCount = Array.from(inMemoryNotifications.values()).filter(
    (n) => n.userId === userId && !n.isRead && !n.dismissedAt
  ).length;

  if (inMemoryCount > 0) return inMemoryCount;
  if (!supabase) return 0;

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .is("dismissed_at", null);

    return error ? 0 : count || 0;
  } catch {
    return 0;
  }
}

export async function markNotificationAsRead(
  supabase: SupabaseClient | null,
  first: string,
  second: string
): Promise<boolean> {
  const notif = inMemoryNotifications.get(first) || inMemoryNotifications.get(second);
  if (notif) {
    notif.isRead = true;
    notif.readAt = new Date().toISOString();
  }

  if (!supabase) return true;

  try {
    const notificationId = notif ? notif.id : first;
    const userId = notif ? notif.userId : second;
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(
  supabase: SupabaseClient | null,
  userId: string
): Promise<boolean> {
  for (const notif of inMemoryNotifications.values()) {
    if (notif.userId === userId) {
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
    }
  }

  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    return !error;
  } catch {
    return false;
  }
}

export async function acknowledgeNotification(
  supabase: SupabaseClient | null,
  first: string,
  second: string
): Promise<boolean> {
  const notif = inMemoryNotifications.get(first) || inMemoryNotifications.get(second);
  if (notif) {
    notif.acknowledgedAt = new Date().toISOString();
    notif.isRead = true;
    if (!notif.readAt) notif.readAt = notif.acknowledgedAt;
  }

  if (!supabase) return true;

  try {
    const notificationId = notif ? notif.id : first;
    const userId = notif ? notif.userId : second;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({
        acknowledged_at: now,
        is_read: true,
        read_at: now,
      })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

export async function dismissNotification(
  supabase: SupabaseClient | null,
  first: string,
  second: string
): Promise<boolean> {
  const notif = inMemoryNotifications.get(first) || inMemoryNotifications.get(second);
  if (notif) {
    notif.dismissedAt = new Date().toISOString();
  }

  if (!supabase) return true;

  try {
    const notificationId = notif ? notif.id : first;
    const userId = notif ? notif.userId : second;
    const { error } = await supabase
      .from("notifications")
      .update({
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 4. DELIVERY RECORD PERSISTENCE
// -----------------------------------------------------------------------------

export async function insertDeliveryRecord(
  supabase: SupabaseClient | null,
  record: NotificationDeliveryRecord
): Promise<NotificationDeliveryRecord> {
  inMemoryDeliveries.set(record.id, record);

  if (!supabase) return record;

  try {
    const { error } = await supabase.from("notification_deliveries").insert({
      id: record.id,
      notification_id: record.notificationId,
      alert_id: record.alertId || null,
      user_id: record.userId,
      channel: record.channel,
      delivery_status: record.deliveryStatus,
      attempt_count: record.attemptCount,
      last_attempt_at: record.lastAttemptAt,
      delivered_at: record.deliveredAt || null,
      error_code: record.errorCode || null,
      error_message: record.errorMessage || null,
      provider_response: record.providerResponse || {},
    });

    if (error) {
      console.warn("DB insertDeliveryRecord warning (in-memory preserved):", error.message);
    }
  } catch (err) {
    console.warn("Exception in insertDeliveryRecord:", err);
  }

  return record;
}

export async function updateDeliveryStatus(
  supabase: SupabaseClient | null,
  deliveryId: string,
  status: DeliveryStatus,
  errorCode?: string | null,
  errorMessage?: string | null
): Promise<boolean> {
  const inMem = inMemoryDeliveries.get(deliveryId);
  if (inMem) {
    inMem.deliveryStatus = status;
    inMem.attemptCount += 1;
    inMem.lastAttemptAt = new Date().toISOString();
    if (status === "DELIVERED") inMem.deliveredAt = inMem.lastAttemptAt;
    inMem.errorCode = errorCode || null;
    inMem.errorMessage = errorMessage || null;
  }

  if (!supabase) return true;

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notification_deliveries")
      .update({
        delivery_status: status,
        last_attempt_at: now,
        delivered_at: status === "DELIVERED" ? now : null,
        error_code: errorCode || null,
        error_message: errorMessage || null,
      })
      .eq("id", deliveryId);

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 5. TARGETING CANDIDATES DISCOVERY
// -----------------------------------------------------------------------------

export async function fetchUserTargetingCandidates(
  supabase: SupabaseClient | null
): Promise<UserTargetingContext[]> {
  if (inMemoryCandidateUsers.length > 0) {
    return inMemoryCandidateUsers;
  }

  if (!supabase) return [];

  try {
    // Join profiles, user_roles, and user_intelligence_preferences
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        state,
        lga,
        user_roles(role_code),
        user_intelligence_preferences(
          primary_role,
          preferred_states,
          preferred_lgas,
          monitored_commodities,
          urgency_threshold,
          notification_channels,
          muted_recommendation_types
        )
      `);

    if (error || !profiles) return [];

    return profiles.map((p) => {
      const rawRoles = (p.user_roles as Array<{ role_code: string }>) || [];
      const roles = rawRoles.map((r) => r.role_code as ActorRole);

      const prefRaw = Array.isArray(p.user_intelligence_preferences)
        ? p.user_intelligence_preferences[0]
        : p.user_intelligence_preferences;

      const preferences: NotificationPreferences | null = prefRaw
        ? {
            userId: p.id,
            enabledCategories: [],
            severityThreshold: prefRaw.urgency_threshold || "INFO",
            enabledChannels: prefRaw.notification_channels || ["IN_APP"],
            preferredStates: prefRaw.preferred_states || [],
            preferredLgas: prefRaw.preferred_lgas || [],
            monitoredCommodities: prefRaw.monitored_commodities || [],
            quietHoursEnabled: false,
            optedOutCategories: [],
            updatedAt: new Date().toISOString(),
          }
        : null;

      return {
        userId: p.id,
        roles,
        state: p.state,
        lga: p.lga,
        preferences,
      };
    });
  } catch {
    return [];
  }
}
