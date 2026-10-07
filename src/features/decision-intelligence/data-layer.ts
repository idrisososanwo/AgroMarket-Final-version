/**
 * AgroMarket Phase 3.2: Agricultural Decision & Action Intelligence Data Layer
 * Persistence, Queries, and Governed Records for User Decisions, Actions, and Preferences
 *
 * SAFETY INVARIANTS:
 * 1. ZERO PORK TOLERANCE: Stringent rejection of prohibited produce terms.
 * 2. AUTHENTIC DATA: Real database queries, zero manufactured outcomes.
 * 3. COMMERCIAL PRIVACY: Does not expose buyer identities or private phone numbers.
 * 4. GRACEFUL FALLBACK: Provides reliable deterministic defaults for offline and testing contexts.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ActionVerificationStatus,
  ActorRole,
  DecisionOutcomeRecord,
  DigestFrequency,
  GovernedActionItem,
  GovernedActionType,
  GovernedNotificationItem,
  RecommendationType,
  UrgencyLevel,
  UserDecisionItem,
  UserDecisionType,
  UserIntelligencePreferences,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

/**
 * Default preferences for a user when none exist in the database
 */
export function getDefaultPreferences(userId: string, role: ActorRole = "FARMER"): UserIntelligencePreferences {
  return {
    userId,
    primaryRole: role,
    preferredStates: [],
    preferredLgas: [],
    monitoredCommodities: [],
    urgencyThreshold: "LOW",
    minConfidence: 0.5,
    notificationChannels: ["IN_APP"],
    digestFrequency: "DAILY",
    mutedRecommendationTypes: [],
    metadata: {},
  };
}

/**
 * Fetch or initialize User Intelligence Preferences
 */
export async function getUserIntelligencePreferences(
  supabase: SupabaseClient | null,
  userId: string,
  fallbackRole: ActorRole = "FARMER"
): Promise<UserIntelligencePreferences> {
  if (!supabase || !userId) {
    return getDefaultPreferences(userId || "guest-user", fallbackRole);
  }

  try {
    const { data, error } = await supabase
      .from("user_intelligence_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return getDefaultPreferences(userId, fallbackRole);
    }

    return {
      id: data.id,
      userId: data.user_id,
      primaryRole: data.primary_role as ActorRole,
      preferredStates: data.preferred_states || [],
      preferredLgas: data.preferred_lgas || [],
      monitoredCommodities: data.monitored_commodities || [],
      urgencyThreshold: (data.urgency_threshold as UrgencyLevel) || "LOW",
      minConfidence: Number(data.min_confidence) || 0.5,
      notificationChannels: data.notification_channels || ["IN_APP"],
      digestFrequency: (data.digest_frequency as DigestFrequency) || "DAILY",
      mutedRecommendationTypes: (data.muted_recommendation_types as RecommendationType[]) || [],
      metadata: (data.metadata as Record<string, unknown>) || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Failed fetching user intelligence preferences:", err);
    return getDefaultPreferences(userId, fallbackRole);
  }
}

/**
 * Upsert User Intelligence Preferences
 */
export async function upsertUserIntelligencePreferences(
  supabase: SupabaseClient,
  preferences: UserIntelligencePreferences
): Promise<UserIntelligencePreferences> {
  // Validate anti-pork on monitored commodities
  for (const c of preferences.monitoredCommodities) {
    assertNoProhibitedProduce(c, "Monitored Commodity");
  }

  const payload = {
    user_id: preferences.userId,
    primary_role: preferences.primaryRole,
    preferred_states: preferences.preferredStates,
    preferred_lgas: preferences.preferredLgas,
    monitored_commodities: preferences.monitoredCommodities,
    urgency_threshold: preferences.urgencyThreshold,
    min_confidence: preferences.minConfidence,
    notification_channels: preferences.notificationChannels,
    digest_frequency: preferences.digestFrequency,
    muted_recommendation_types: preferences.mutedRecommendationTypes,
    metadata: preferences.metadata || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_intelligence_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save intelligence preferences: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    primaryRole: data.primary_role as ActorRole,
    preferredStates: data.preferred_states || [],
    preferredLgas: data.preferred_lgas || [],
    monitoredCommodities: data.monitored_commodities || [],
    urgencyThreshold: data.urgency_threshold as UrgencyLevel,
    minConfidence: Number(data.min_confidence),
    notificationChannels: data.notification_channels || ["IN_APP"],
    digestFrequency: data.digest_frequency as DigestFrequency,
    mutedRecommendationTypes: (data.muted_recommendation_types as RecommendationType[]) || [],
    metadata: (data.metadata as Record<string, unknown>) || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Record a user decision on an actionable recommendation
 */
export async function recordUserDecision(
  supabase: SupabaseClient,
  decisionItem: UserDecisionItem
): Promise<UserDecisionItem> {
  if (decisionItem.decisionNotes) {
    assertNoProhibitedProduce(decisionItem.decisionNotes, "Decision Notes");
  }
  if (decisionItem.reasoning) {
    assertNoProhibitedProduce(decisionItem.reasoning, "Reasoning");
  }

  const payload = {
    recommendation_id: decisionItem.recommendationId,
    user_id: decisionItem.userId,
    decision: decisionItem.decision,
    actor_role: decisionItem.actorRole,
    decision_notes: decisionItem.decisionNotes || null,
    reasoning: decisionItem.reasoning || null,
    metadata: decisionItem.metadata || {},
    decided_at: decisionItem.decidedAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("agricultural_decisions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record decision: ${error.message}`);
  }

  return {
    id: data.id,
    recommendationId: data.recommendation_id,
    userId: data.user_id,
    decision: data.decision as UserDecisionType,
    actorRole: data.actor_role,
    decisionNotes: data.decision_notes,
    reasoning: data.reasoning,
    metadata: (data.metadata as Record<string, unknown>) || {},
    decidedAt: data.decided_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Record a governed user action
 */
export async function recordGovernedAction(
  supabase: SupabaseClient,
  actionItem: GovernedActionItem
): Promise<GovernedActionItem> {
  if (actionItem.notes) {
    assertNoProhibitedProduce(actionItem.notes, "Action Notes");
  }

  const payload = {
    decision_id: actionItem.decisionId || null,
    recommendation_id: actionItem.recommendationId,
    user_id: actionItem.userId,
    action_type: actionItem.actionType,
    action_path: actionItem.actionPath || null,
    is_external: actionItem.isExternal,
    verification_status: actionItem.verificationStatus,
    action_details: actionItem.actionDetails || {},
    notes: actionItem.notes || null,
    executed_at: actionItem.executedAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("agricultural_actions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record action: ${error.message}`);
  }

  // If both decisionId and actionId exist, link them
  if (actionItem.decisionId && data.id) {
    try {
      await supabase.from("decision_action_links").insert({
        decision_id: actionItem.decisionId,
        action_id: data.id,
      });
    } catch (linkErr) {
      console.warn("Failed linking decision to action:", linkErr);
    }
  }

  return {
    id: data.id,
    decisionId: data.decision_id,
    recommendationId: data.recommendation_id,
    userId: data.user_id,
    actionType: data.action_type as GovernedActionType,
    actionPath: data.action_path,
    isExternal: data.is_external,
    verificationStatus: data.verification_status as ActionVerificationStatus,
    actionDetails: (data.action_details as Record<string, unknown>) || {},
    notes: data.notes,
    executedAt: data.executed_at,
    createdAt: data.created_at,
  };
}

/**
 * Fetch decisions made by a specific user
 */
export async function getUserDecisions(
  supabase: SupabaseClient | null,
  userId: string,
  limit = 30
): Promise<UserDecisionItem[]> {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from("agricultural_decisions")
      .select("*")
      .eq("user_id", userId)
      .order("decided_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      recommendationId: d.recommendation_id,
      userId: d.user_id,
      decision: d.decision as UserDecisionType,
      actorRole: d.actor_role,
      decisionNotes: d.decision_notes,
      reasoning: d.reasoning,
      metadata: (d.metadata as Record<string, unknown>) || {},
      decidedAt: d.decided_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  } catch (err) {
    console.warn("Error fetching user decisions:", err);
    return [];
  }
}

/**
 * Fetch actions performed by a specific user
 */
export async function getUserActions(
  supabase: SupabaseClient | null,
  userId: string,
  limit = 30
): Promise<GovernedActionItem[]> {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from("agricultural_actions")
      .select("*")
      .eq("user_id", userId)
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((a) => ({
      id: a.id,
      decisionId: a.decision_id,
      recommendationId: a.recommendation_id,
      userId: a.user_id,
      actionType: a.action_type as GovernedActionType,
      actionPath: a.action_path,
      isExternal: a.is_external,
      verificationStatus: a.verification_status as ActionVerificationStatus,
      actionDetails: (a.action_details as Record<string, unknown>) || {},
      notes: a.notes,
      executedAt: a.executed_at,
      createdAt: a.created_at,
    }));
  } catch (err) {
    console.warn("Error fetching user actions:", err);
    return [];
  }
}

/**
 * Fetch Governed Notifications for a user
 */
export async function getUserGovernedNotifications(
  supabase: SupabaseClient | null,
  userId: string,
  limit = 20
): Promise<GovernedNotificationItem[]> {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((n) => {
      const raw = n as unknown as {
        severity?: string | null;
        expires_at?: string | null;
        metadata?: Record<string, unknown> | null;
      };

      return {
        id: n.id,
        userId: n.user_id,
        type: n.type,
        channel: n.channel,
        title: n.title,
        body: n.body,
        actionUrl: n.action_url,
        isRead: n.is_read,
        readAt: n.read_at,
        severity: (raw.severity as UrgencyLevel) || "MEDIUM",
        expiresAt: raw.expires_at || null,
        metadata: raw.metadata || {},
        createdAt: n.created_at,
      };
    });
  } catch (err) {
    console.warn("Error fetching notifications:", err);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Fetch linked outcomes for recommendations
 */
export async function getLinkedOutcomesForRecommendations(
  supabase: SupabaseClient | null,
  recommendationIds: string[]
): Promise<Record<string, DecisionOutcomeRecord>> {
  if (!supabase || recommendationIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from("agricultural_orchestration_outcomes")
      .select("*")
      .in("recommendation_id", recommendationIds);

    if (error || !data) return {};

    const map: Record<string, DecisionOutcomeRecord> = {};
    for (const item of data) {
      map[item.recommendation_id] = {
        id: item.id,
        recommendationId: item.recommendation_id,
        decision: item.decision,
        actionTaken: item.action_taken,
        actionTime: item.action_time,
        observedOutcome: item.observed_outcome,
        expectedOutcome: item.expected_outcome,
        variance: item.variance,
        evaluationScore: Number(item.evaluation_score) || 0,
        lessonsLearned: item.lessons_learned,
        recordedBy: item.recorded_by,
        createdAt: item.created_at,
      };
    }
    return map;
  } catch (err) {
    console.warn("Error fetching outcomes:", err);
    return {};
  }
}
