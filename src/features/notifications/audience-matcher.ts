/**
 * AgroMarket Phase 3.16: Notification Audience Matcher
 * Evaluates user eligibility against agricultural alert targeting and preferences.
 */

import {
  AgriculturalIntelligenceAlert,
  NotificationPreferences,
  AlertSeverity,
  CandidateUser,
  TargetAudience,
  NotificationCategory,
} from "./types";
import { SEVERITY_RANK } from "./constants";

export type UserTargetingContext = CandidateUser;

/**
 * Checks whether current UTC time falls within a user's configured quiet hours window.
 * Format: HH:MM (e.g., "21:00" to "05:00")
 */
export function isCurrentlyInQuietHours(
  startUtc?: string,
  endUtc?: string,
  nowUtc = new Date()
): boolean {
  if (!startUtc || !endUtc) return false;

  const currentMinutes = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();

  const [startH, startM] = startUtc.split(":").map(Number);
  const [endH, endM] = endUtc.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Single-day window (e.g. 01:00 to 05:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window (e.g. 21:00 to 05:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Deterministically evaluates whether a given user is eligible to receive an alert.
 */
export function isUserEligibleForAlert(
  user: UserTargetingContext,
  alert: Partial<AgriculturalIntelligenceAlert> & {
    category: NotificationCategory | string;
    severity: AlertSeverity;
    commodityName?: string;
    targetAudience?: TargetAudience | null;
  },
  nowUtc = new Date()
): { eligible: boolean; reason: string } {
  const { preferences, state, lga } = user;
  const prefs = preferences as
    | (Partial<NotificationPreferences> & {
        minimumSeverity?: AlertSeverity;
        monitoredStates?: string[];
      })
    | null
    | undefined;
  const userRoles = (user.roles || (user.role ? [user.role] : [])) as string[];
  const target = alert.targetAudience || {};

  // 1. Category opt-out / muting check
  if (prefs) {
    const optedOut = prefs.optedOutCategories || [];
    if (optedOut.includes(alert.category)) {
      return { eligible: false, reason: "Category opted out in preferences" };
    }

    const enabledCategories = prefs.enabledCategories || [];
    if (enabledCategories.length > 0 && !enabledCategories.includes(alert.category)) {
      return { eligible: false, reason: "Category disabled in user preferences" };
    }

    // 2. User severity threshold check
    const threshold = (prefs.severityThreshold || prefs.minimumSeverity || "INFO") as AlertSeverity;
    const userThresholdRank = SEVERITY_RANK[threshold] ?? 0;
    const alertSeverityRank = SEVERITY_RANK[alert.severity] ?? 0;

    if (alertSeverityRank < userThresholdRank) {
      return {
        eligible: false,
        reason: `Alert severity ${alert.severity} below user minimum threshold ${threshold}`,
      };
    }

    // 3. Quiet hours check (Critical alerts bypass quiet hours)
    if (
      prefs.quietHoursEnabled &&
      alert.severity !== "CRITICAL" &&
      isCurrentlyInQuietHours(
        prefs.quietHoursStartUtc,
        prefs.quietHoursEndUtc,
        nowUtc
      )
    ) {
      return { eligible: false, reason: "quiet hours active for non-critical alert" };
    }
  }

  // 4. Role targeting match
  if (target.roles && target.roles.length > 0) {
    const hasMatchingRole = target.roles.some((r: string) => userRoles.includes(r));
    if (!hasMatchingRole) {
      return {
        eligible: false,
        reason: `Role ${userRoles.join(", ")} not in target audience`,
      };
    }
  }

  // 5. Geographic state targeting match
  if (target.states && target.states.length > 0) {
    const userStates = [
      state,
      ...(prefs?.preferredStates || prefs?.monitoredStates || []),
    ]
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .map((s: string) => s.trim().toLowerCase());
    const targetStates = target.states.map((s: string) => s.trim().toLowerCase());

    const matchesState = targetStates.some((ts: string) => userStates.includes(ts));
    if (!matchesState) {
      return { eligible: false, reason: "User state does not match targeted states" };
    }
  }

  // 6. LGA targeting match (if specified)
  if (target.lgas && target.lgas.length > 0 && lga) {
    const userLgas = [lga, ...(prefs?.preferredLgas || [])]
      .filter((l): l is string => typeof l === "string" && l.length > 0)
      .map((l: string) => l.trim().toLowerCase());
    const targetLgas = target.lgas.map((l: string) => l.trim().toLowerCase());

    const matchesLga = targetLgas.some((tl: string) => userLgas.includes(tl));
    if (!matchesLga) {
      return { eligible: false, reason: "User LGA does not match targeted LGAs" };
    }
  }

  // 7. Commodity interest targeting match (if specified)
  const targetCommodities = (target.commodities || (alert.commodityName ? [alert.commodityName] : [])).map((c: string) =>
    c.trim().toLowerCase()
  );
  if (targetCommodities.length > 0 && prefs?.monitoredCommodities && prefs.monitoredCommodities.length > 0) {
    const userComms = prefs.monitoredCommodities.map((c: string) => c.trim().toLowerCase());
    const matchesCommodity = targetCommodities.some((tc: string) => userComms.includes(tc));
    if (!matchesCommodity && target.commodities && target.commodities.length > 0) {
      return {
        eligible: false,
        reason: "User monitored commodities do not match targeted commodities",
      };
    }
  }

  return { eligible: true, reason: "User matches audience criteria and preferences" };
}

/**
 * Filter an array of user candidates to those eligible for an alert.
 */
export function findEligibleRecipients(
  candidates: UserTargetingContext[],
  alert: AgriculturalIntelligenceAlert,
  nowUtc = new Date()
): string[] {
  const matchedUserIds = new Set<string>();

  for (const candidate of candidates) {
    const result = isUserEligibleForAlert(candidate, alert, nowUtc);
    if (result.eligible) {
      matchedUserIds.add(candidate.userId);
    }
  }

  return Array.from(matchedUserIds);
}
