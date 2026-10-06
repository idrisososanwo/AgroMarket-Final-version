/**
 * AgroMarket Phase 2.8: Food Security Server Queries
 * Provides privacy-preserving and verified data access for early-warning dashboards.
 */

import { createClient } from "@/lib/supabase/server";
import {
  FoodSecuritySnapshotRecord,
  AgriculturalResilienceSnapshotRecord,
  FoodSecurityAlertRecord,
  CriticalDependencyItem,
  FoodSecurityOverviewStats,
} from "./types";

/**
 * Fetches recent food security snapshots
 */
export async function getFoodSecuritySnapshots(
  options: {
    limit?: number;
    state?: string;
    commodity?: string;
  } = {}
): Promise<FoodSecuritySnapshotRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("food_security_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }
    if (options.commodity) {
      query = query.ilike("commodity", `%${options.commodity}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      pressure_score: Number(row.pressure_score),
      confidence: Number(row.confidence),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches agricultural resilience snapshots
 */
export async function getResilienceSnapshots(
  options: {
    limit?: number;
    state?: string;
  } = {}
): Promise<AgriculturalResilienceSnapshotRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_resilience_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      resilience_score: Number(row.resilience_score),
      confidence: Number(row.confidence),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches critical dependencies
 */
export async function getFoodSecurityDependencies(
  options: {
    limit?: number;
    state?: string;
  } = {}
): Promise<CriticalDependencyItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("food_security_dependencies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      snapshotId: row.snapshot_id,
      commodity: row.commodity,
      state: row.state,
      dependencyType: row.dependency_type,
      dominantEntity: row.dominant_entity,
      concentrationRatio: Number(row.concentration_ratio),
      thresholdExceeded: Number(row.threshold_exceeded),
      alternativeOptionsAvailable: Number(row.alternative_options_available),
      riskAssessment: row.risk_assessment,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches food security alerts (published public alerts, or all if authorized)
 */
export async function getFoodSecurityAlerts(
  options: {
    limit?: number;
    includeDrafts?: boolean;
    severity?: string;
  } = {}
): Promise<FoodSecurityAlertRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("food_security_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 30);

    if (!options.includeDrafts) {
      query = query.eq("is_public", true).eq("status", "PUBLISHED");
    }

    if (options.severity) {
      query = query.eq("severity", options.severity);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      confidence: Number(row.confidence),
    }));
  } catch {
    return [];
  }
}

/**
 * High-level overview statistics for the early-warning dashboard
 */
export async function getFoodSecurityOverviewStats(): Promise<FoodSecurityOverviewStats> {
  const defaultStats: FoodSecurityOverviewStats = {
    averagePressureScore: 0,
    averageResilienceScore: 0,
    activeAlertsCount: 0,
    criticalAlertsCount: 0,
    highPressureCommoditiesCount: 0,
    stressedRegionsCount: 0,
    criticalDependenciesCount: 0,
    totalEvaluatedStatesCount: 0,
  };

  try {
    const supabase = await createClient();

    const [
      { data: pressureSnaps },
      { data: resilienceSnaps },
      { data: alerts },
      { count: depCount },
    ] = await Promise.all([
      supabase.from("food_security_snapshots").select("pressure_score, pressure_level, state, commodity").limit(100),
      supabase.from("agricultural_resilience_snapshots").select("resilience_score").limit(100),
      supabase.from("food_security_alerts").select("severity, status").limit(50),
      supabase.from("food_security_dependencies").select("*", { count: "exact", head: true }),
    ]);

    let totalPressure = 0;
    let highPressureCommoditiesCount = 0;
    const stressedStates = new Set<string>();
    const evaluatedStates = new Set<string>();

    if (pressureSnaps && pressureSnaps.length > 0) {
      for (const s of pressureSnaps) {
        totalPressure += Number(s.pressure_score) || 0;
        evaluatedStates.add(s.state);
        if (s.pressure_level === "HIGH_PRESSURE" || s.pressure_level === "CRITICAL_PRESSURE") {
          highPressureCommoditiesCount++;
          stressedStates.add(s.state);
        }
      }
    }

    let totalResilience = 0;
    if (resilienceSnaps && resilienceSnaps.length > 0) {
      for (const r of resilienceSnaps) {
        totalResilience += Number(r.resilience_score) || 0;
      }
    }

    let activeAlertsCount = 0;
    let criticalAlertsCount = 0;
    if (alerts && alerts.length > 0) {
      for (const a of alerts) {
        if (a.status === "PUBLISHED" || a.status === "REVIEW") {
          activeAlertsCount++;
          if (a.severity === "CRITICAL" || a.severity === "HIGH") {
            criticalAlertsCount++;
          }
        }
      }
    }

    return {
      averagePressureScore: pressureSnaps && pressureSnaps.length > 0 ? Math.round((totalPressure / pressureSnaps.length) * 10) / 10 : 0,
      averageResilienceScore: resilienceSnaps && resilienceSnaps.length > 0 ? Math.round((totalResilience / resilienceSnaps.length) * 10) / 10 : 0,
      activeAlertsCount,
      criticalAlertsCount,
      highPressureCommoditiesCount,
      stressedRegionsCount: stressedStates.size,
      criticalDependenciesCount: typeof depCount === "number" ? depCount : 0,
      totalEvaluatedStatesCount: evaluatedStates.size,
    };
  } catch {
    return defaultStats;
  }
}
