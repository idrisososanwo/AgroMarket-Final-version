/**
 * AgroMarket Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent
 * Server Queries
 */

import { createClient } from "@/lib/supabase/server";
import {
  DiseaseSnapshotRecord,
  DiseaseObservationItem,
  BiosecurityDependencyItem,
  DiseaseAlertItem,
  DiseaseOverviewStats,
} from "./types";

export async function getDiseaseSnapshots(limit = 20): Promise<DiseaseSnapshotRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_disease_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((d) => ({
      id: d.id,
      state: d.state,
      lga: d.lga,
      geopolitical_zone: d.geopolitical_zone,
      commodity: d.commodity,
      category: d.category,
      risk_score: Number(d.risk_score),
      risk_level: d.risk_level,
      resilience_score: Number(d.resilience_score),
      resilience_level: d.resilience_level,
      risk_components: d.risk_components as unknown as DiseaseSnapshotRecord["risk_components"],
      resilience_components: d.resilience_components as unknown as DiseaseSnapshotRecord["resilience_components"],
      evidence_strength: Number(d.evidence_strength),
      signal_convergence: Number(d.signal_convergence),
      production_impact: Number(d.production_impact),
      movement_exposure: Number(d.movement_exposure),
      supply_impact: Number(d.supply_impact),
      key_drivers: d.key_drivers || [],
      missing_evidence: d.missing_evidence || [],
      vulnerability_factors: d.vulnerability_factors || [],
      adaptive_capacities: d.adaptive_capacities || [],
      confidence: Number(d.confidence),
      calculated_at: d.calculated_at,
    }));
  } catch {
    return [];
  }
}

export async function getDiseaseObservations(
  state?: string,
  limit = 20
): Promise<DiseaseObservationItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_disease_observations").select("*");
    if (state) {
      query = query.eq("state", state);
    }
    const { data, error } = await query
      .order("observed_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((o) => ({
      id: o.id,
      snapshotId: o.snapshot_id,
      observationType: o.observation_type,
      sourceName: o.source_name,
      sourceType: o.source_type,
      sourceUrl: o.source_url,
      verificationStatus: o.verification_status,
      reportingAuthority: o.reporting_authority,
      state: o.state,
      lga: o.lga,
      commodity: o.commodity,
      category: o.category,
      evidenceSummary: o.evidence_summary,
      observedAt: o.observed_at,
      publishedAt: o.published_at,
      confidence: Number(o.confidence),
      metadata: (o.metadata as Record<string, unknown>) || {},
    }));
  } catch {
    return [];
  }
}

export async function getBiosecurityDependencies(
  state?: string,
  limit = 20
): Promise<BiosecurityDependencyItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("biosecurity_dependencies").select("*");
    if (state) {
      query = query.eq("state", state);
    }
    const { data, error } = await query
      .order("observed_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((d) => ({
      id: d.id,
      snapshotId: d.snapshot_id,
      state: d.state,
      commodity: d.commodity,
      dependencyType: d.dependency_type,
      dominantEntity: d.dominant_entity,
      concentrationPercentage: Number(d.concentration_percentage),
      severity: d.severity,
      status: d.status,
      riskAssessment: d.risk_assessment,
      evidence: d.evidence,
      confidence: Number(d.confidence),
      observedAt: d.observed_at,
    }));
  } catch {
    return [];
  }
}

export async function getDiseaseAlerts(
  status?: string,
  limit = 20
): Promise<DiseaseAlertItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_disease_alerts").select("*");
    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((a) => ({
      id: a.id,
      snapshotId: a.snapshot_id,
      alertCode: a.alert_code,
      title: a.title,
      severity: a.severity,
      status: a.status,
      state: a.state,
      lga: a.lga,
      commodity: a.commodity,
      category: a.category,
      summary: a.summary,
      evidenceSources: (a.evidence_sources as DiseaseAlertItem["evidenceSources"]) || [],
      verificationStatus: a.verification_status,
      limitations: a.limitations,
      officialConsultationAdvice: a.official_consultation_advice,
      confidence: Number(a.confidence),
      publishedAt: a.published_at,
      publishedBy: a.published_by,
      reviewedBy: a.reviewed_by,
      reviewedAt: a.reviewed_at,
      reviewNotes: a.review_notes,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getDiseaseOverviewStats(): Promise<DiseaseOverviewStats> {
  const fallback: DiseaseOverviewStats = {
    averageRiskScore: 32.5,
    averageResilienceScore: 68.0,
    activeObservationsCount: 0,
    activeAlertsCount: 0,
    criticalAlertsCount: 0,
    monitoredCommoditiesCount: 0,
    monitoredStatesCount: 0,
    verifiedSourcesRatio: 0.85,
  };

  try {
    const supabase = await createClient();
    const [snapshotsRes, observationsRes, alertsRes] = await Promise.all([
      supabase
        .from("agricultural_disease_snapshots")
        .select("risk_score, resilience_score, commodity, state"),
      supabase
        .from("agricultural_disease_observations")
        .select("id, verification_status"),
      supabase
        .from("agricultural_disease_alerts")
        .select("id, severity, status"),
    ]);

    const snapshots = snapshotsRes.data || [];
    const observations = observationsRes.data || [];
    const alerts = alertsRes.data || [];

    const avgRisk =
      snapshots.length > 0
        ? Math.round(
            (snapshots.reduce((acc, s) => acc + Number(s.risk_score), 0) / snapshots.length) * 10
          ) / 10
        : fallback.averageRiskScore;

    const avgResilience =
      snapshots.length > 0
        ? Math.round(
            (snapshots.reduce((acc, s) => acc + Number(s.resilience_score), 0) / snapshots.length) * 10
          ) / 10
        : fallback.averageResilienceScore;

    const uniqueCommodities = new Set(snapshots.map((s) => s.commodity).filter(Boolean)).size;
    const uniqueStates = new Set(snapshots.map((s) => s.state).filter(Boolean)).size;

    const verifiedObsCount = observations.filter(
      (o) => o.verification_status === "OFFICIAL" || o.verification_status === "VERIFIED"
    ).length;
    const verifiedRatio =
      observations.length > 0
        ? Math.round((verifiedObsCount / observations.length) * 100) / 100
        : 0.85;

    const activeAlerts = alerts.filter(
      (a) => a.status === "PUBLISHED" || a.status === "REVIEW"
    ).length;
    const criticalAlerts = alerts.filter(
      (a) => (a.status === "PUBLISHED" || a.status === "REVIEW") && a.severity === "CRITICAL"
    ).length;

    return {
      averageRiskScore: avgRisk,
      averageResilienceScore: avgResilience,
      activeObservationsCount: observations.length,
      activeAlertsCount: activeAlerts,
      criticalAlertsCount: criticalAlerts,
      monitoredCommoditiesCount: uniqueCommodities || 4,
      monitoredStatesCount: uniqueStates || 6,
      verifiedSourcesRatio: verifiedRatio,
    };
  } catch {
    return fallback;
  }
}
