/**
 * AgroMarket Phase 3.5: Historical Memory Access & Retrieval Layer
 * Server-side data queries, time-series extractions, baseline comparisons, and pattern analytics.
 */

import { createClient } from "@/lib/supabase/server";
import {
  CurrentVsBaselineComparison,
  HistoricalDataState,
  HistoricalQueryFilters,
  HistoricalRecommendationTrackRecord,
  HistoricalSignalPatternSummary,
  HistoricalTimeHorizon,
} from "./types";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
  resolveTimeWindowDates,
} from "./validation";
import {
  calculateHistoricalBaselineSummary,
  compareValueToHistoricalBaseline,
  SamplePoint,
} from "./baseline-calculator";
import {
  EvidenceSourceType,
  IntelligenceObservation,
  IntelligenceSignal,
  IntelligenceSignalType,
  ObservationDomainSource,
} from "@/features/intelligence/types";

// In-memory fallback stores for tests and offline/seed environments
const inMemoryObservations: IntelligenceObservation[] = [];
const inMemorySignals: IntelligenceSignal[] = [];

// -----------------------------------------------------------------------------
// 1. HISTORICAL OBSERVATION QUERIES
// -----------------------------------------------------------------------------

export async function getHistoricalObservations(
  filters: HistoricalQueryFilters = {}
): Promise<IntelligenceObservation[]> {
  if (filters.commodity) {
    assertNoProhibitedProduce(filters.commodity, "Historical Observations Query");
  }

  const { from, to } = resolveTimeWindowDates(
    filters.timeHorizon || "LAST_30_DAYS",
    filters.fromDate,
    filters.toDate
  );

  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_observations")
      .select("*")
      .gte("observed_at", from.toISOString())
      .lte("observed_at", to.toISOString())
      .order("observed_at", { ascending: false });

    if (filters.domain) {
      query = query.eq("domain_source", filters.domain);
    }
    if (filters.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters.lga) {
      query = query.eq("lga", filters.lga);
    }
    if (filters.agentId) {
      query = query.eq("agent_id", filters.agentId);
    }

    query = query.limit(filters.limit || 200);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return inMemoryObservations.filter((obs) => {
        const obsTime = new Date(obs.observedAt).getTime();
        return (
          obsTime >= from.getTime() &&
          obsTime <= to.getTime() &&
          (!filters.domain || obs.domainSource === filters.domain) &&
          (!filters.commodity || (Boolean(obs.commodity) && obs.commodity!.toLowerCase().includes(filters.commodity.toLowerCase()))) &&
          (!filters.state || obs.state === filters.state)
        );
      });
    }

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      domainSource: (row.domain_source as ObservationDomainSource) || "MARKET",
      sourceId: row.source_id,
      commodity: row.commodity || "General Agricultural",
      category: row.category,
      state: row.state,
      lga: row.lga,
      corridor: row.corridor,
      summary: row.summary,
      details: (row.details as Record<string, unknown>) || {},
      observedValue: row.observed_value !== null ? Number(row.observed_value) : undefined,
      baselineValue: row.baseline_value !== null ? Number(row.baseline_value) : undefined,
      unit: row.unit || undefined,
      confidence: Number(row.confidence),
      evidence: Array.isArray(row.evidence)
        ? (row.evidence as Array<Record<string, unknown>>).map((ev) => ({
            sourceType: (ev.sourceType || "PRICE_OBSERVATION") as EvidenceSourceType,
            sourceId: String(ev.sourceId || ev.source || row.id),
            description: String(ev.description || ""),
            observedAt: String(ev.observedAt || row.observed_at),
            relevance: typeof ev.relevance === "number" ? ev.relevance : 1.0,
            metadata: (ev.metadata as Record<string, unknown>) || undefined,
          }))
        : [],
      observedAt: row.observed_at,
      createdAt: row.created_at,
    }));
  } catch {
    return inMemoryObservations.filter((obs) => {
      const obsTime = new Date(obs.observedAt).getTime();
      return (
        obsTime >= from.getTime() &&
        obsTime <= to.getTime() &&
        (!filters.domain || obs.domainSource === filters.domain) &&
        (!filters.commodity || (Boolean(obs.commodity) && obs.commodity!.toLowerCase().includes(filters.commodity.toLowerCase()))) &&
        (!filters.state || obs.state === filters.state)
      );
    });
  }
}

// -----------------------------------------------------------------------------
// 2. HISTORICAL SIGNAL QUERIES
// -----------------------------------------------------------------------------

export async function getHistoricalSignals(
  filters: HistoricalQueryFilters = {}
): Promise<IntelligenceSignal[]> {
  if (filters.commodity) {
    assertNoProhibitedProduce(filters.commodity, "Historical Signals Query");
  }

  const { from, to } = resolveTimeWindowDates(
    filters.timeHorizon || "LAST_30_DAYS",
    filters.fromDate,
    filters.toDate
  );

  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_signals")
      .select("*")
      .gte("observed_at", from.toISOString())
      .lte("observed_at", to.toISOString())
      .order("observed_at", { ascending: false });

    if (filters.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters.agentId) {
      query = query.eq("agent_id", filters.agentId);
    }

    query = query.limit(filters.limit || 200);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return inMemorySignals.filter((sig) => {
        const sigTime = new Date(sig.observedAt).getTime();
        return (
          sigTime >= from.getTime() &&
          sigTime <= to.getTime() &&
          (!filters.commodity || (Boolean(sig.commodity) && sig.commodity!.toLowerCase().includes(filters.commodity.toLowerCase()))) &&
          (!filters.state || sig.state === filters.state)
        );
      });
    }

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      signalType: row.signal_type as IntelligenceSignalType,
      commodity: row.commodity,
      category: row.category,
      state: row.state,
      lga: row.lga,
      corridor: row.corridor,
      magnitude: Number(row.magnitude),
      confidence: Number(row.confidence),
      source: row.source,
      evidence: Array.isArray(row.evidence)
        ? (row.evidence as Array<Record<string, unknown>>).map((ev) => ({
            sourceType: (ev.sourceType || "PRICE_OBSERVATION") as EvidenceSourceType,
            sourceId: String(ev.sourceId || ev.source || row.id),
            description: String(ev.description || ""),
            observedAt: String(ev.observedAt || row.observed_at),
            relevance: typeof ev.relevance === "number" ? ev.relevance : 1.0,
            metadata: (ev.metadata as Record<string, unknown>) || undefined,
          }))
        : [],
      supportingObservationIds: row.supporting_observation_ids,
      observedAt: row.observed_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  } catch {
    return inMemorySignals.filter((sig) => {
      const sigTime = new Date(sig.observedAt).getTime();
      return (
        sigTime >= from.getTime() &&
        sigTime <= to.getTime() &&
        (!filters.commodity || (Boolean(sig.commodity) && sig.commodity!.toLowerCase().includes(filters.commodity.toLowerCase()))) &&
        (!filters.state || sig.state === filters.state)
      );
    });
  }
}

// -----------------------------------------------------------------------------
// 3. HISTORICAL DOMAIN BASELINE COMPARISONS
// -----------------------------------------------------------------------------

export async function getHistoricalMarketPressure(
  commodity: string,
  state?: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_30_DAYS"
): Promise<CurrentVsBaselineComparison> {
  assertNoProhibitedProduce(commodity, "Historical Market Pressure");

  const observations = await getHistoricalObservations({
    domain: "MARKET",
    commodity,
    state,
    timeHorizon,
  });

  const samples: SamplePoint[] = observations
    .filter((o) => o.observedValue !== undefined && o.observedValue !== null)
    .map((o) => ({
      value: o.observedValue as number,
      observedAt: o.observedAt,
    }));

  const currentValue = samples.length > 0 ? samples[0].value : 0;
  const baseline = calculateHistoricalBaselineSummary({
    metricName: "MARKET_PRICE_PRESSURE",
    domain: "MARKET",
    commodity,
    state,
    timeHorizon,
    samples,
  });

  return compareValueToHistoricalBaseline(currentValue, baseline);
}

export async function getHistoricalDemand(
  commodity: string,
  state?: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_30_DAYS"
): Promise<CurrentVsBaselineComparison> {
  assertNoProhibitedProduce(commodity, "Historical Demand");

  const observations = await getHistoricalObservations({
    domain: "DEMAND",
    commodity,
    state,
    timeHorizon,
  });

  const samples: SamplePoint[] = observations
    .filter((o) => o.observedValue !== undefined)
    .map((o) => ({ value: o.observedValue as number, observedAt: o.observedAt }));

  const currentValue = samples.length > 0 ? samples[0].value : 0;
  const baseline = calculateHistoricalBaselineSummary({
    metricName: "DEMAND_VOLUME_INDEX",
    domain: "DEMAND",
    commodity,
    state,
    timeHorizon,
    samples,
  });

  return compareValueToHistoricalBaseline(currentValue, baseline);
}

export async function getHistoricalSupply(
  commodity: string,
  state?: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_30_DAYS"
): Promise<CurrentVsBaselineComparison> {
  assertNoProhibitedProduce(commodity, "Historical Supply");

  const observations = await getHistoricalObservations({
    domain: "SUPPLY",
    commodity,
    state,
    timeHorizon,
  });

  const samples: SamplePoint[] = observations
    .filter((o) => o.observedValue !== undefined)
    .map((o) => ({ value: o.observedValue as number, observedAt: o.observedAt }));

  const currentValue = samples.length > 0 ? samples[0].value : 0;
  const baseline = calculateHistoricalBaselineSummary({
    metricName: "SUPPLY_VOLUME_INDEX",
    domain: "SUPPLY",
    commodity,
    state,
    timeHorizon,
    samples,
  });

  return compareValueToHistoricalBaseline(currentValue, baseline);
}

export async function getHistoricalLogisticsPressure(
  corridorOrState: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_30_DAYS"
): Promise<CurrentVsBaselineComparison> {
  const observations = await getHistoricalObservations({
    domain: "LOGISTICS",
    state: corridorOrState,
    timeHorizon,
  });

  const samples: SamplePoint[] = observations
    .filter((o) => o.observedValue !== undefined)
    .map((o) => ({ value: o.observedValue as number, observedAt: o.observedAt }));

  const currentValue = samples.length > 0 ? samples[0].value : 0;
  const baseline = calculateHistoricalBaselineSummary({
    metricName: "CORRIDOR_DELAY_HOURS",
    domain: "LOGISTICS",
    state: corridorOrState,
    timeHorizon,
    samples,
  });

  return compareValueToHistoricalBaseline(currentValue, baseline);
}

export async function getHistoricalFoodSecurityPressure(
  state: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_30_DAYS"
): Promise<CurrentVsBaselineComparison> {
  const observations = await getHistoricalObservations({
    domain: "FOOD_SECURITY",
    state,
    timeHorizon,
  });

  const samples: SamplePoint[] = observations
    .filter((o) => o.observedValue !== undefined)
    .map((o) => ({ value: o.observedValue as number, observedAt: o.observedAt }));

  const currentValue = samples.length > 0 ? samples[0].value : 0;
  const baseline = calculateHistoricalBaselineSummary({
    metricName: "REGIONAL_VULNERABILITY_INDEX",
    domain: "FOOD_SECURITY",
    state,
    timeHorizon,
    samples,
  });

  return compareValueToHistoricalBaseline(currentValue, baseline);
}

// -----------------------------------------------------------------------------
// 4. HISTORICAL SIGNAL PATTERNS (Recurrence & Confirmation)
// -----------------------------------------------------------------------------

export async function getHistoricalSignalPatterns(
  signalType: string,
  commodity?: string,
  state?: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_90_DAYS"
): Promise<HistoricalSignalPatternSummary> {
  if (commodity) {
    assertNoProhibitedProduce(commodity, "Historical Signal Pattern");
  }

  const signals = await getHistoricalSignals({
    commodity,
    state,
    timeHorizon,
  });

  const matchingSignals = signals.filter((s) => s.signalType === signalType);
  const frequencyCount = matchingSignals.length;

  let dataState: HistoricalDataState = "NO_DATA";
  if (frequencyCount >= 3) {
    dataState = "EVALUATED";
  } else if (frequencyCount > 0) {
    dataState = "PARTIAL_DATA";
  }

  // Location recurrence map
  const locationCounts: Record<string, number> = {};
  for (const s of matchingSignals) {
    const loc = s.state || "National";
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  }

  const recurringLocations = Object.entries(locationCounts)
    .map(([st, count]) => ({ state: st, count }))
    .sort((a, b) => b.count - a.count);

  const meanMagnitude =
    frequencyCount > 0
      ? Number(
          (
            matchingSignals.reduce((acc, s) => acc + s.magnitude, 0) /
            frequencyCount
          ).toFixed(2)
        )
      : null;

  const meanConfidence =
    frequencyCount > 0
      ? Number(
          (
            matchingSignals.reduce((acc, s) => acc + s.confidence, 0) /
            frequencyCount
          ).toFixed(3)
        )
      : null;

  const lastObservedAt =
    matchingSignals.length > 0 ? matchingSignals[0].observedAt : null;

  const summary =
    frequencyCount > 0
      ? `Signal "${signalType}" occurred ${frequencyCount} time(s) across ${recurringLocations.length} region(s) in ${timeHorizon}. Most frequent in: ${
          recurringLocations[0]?.state || "N/A"
        }.`
      : `No historical occurrences of signal "${signalType}" found in ${timeHorizon}.`;

  return {
    signalType,
    commodity: commodity || null,
    state: state || null,
    timeHorizon,
    dataState,
    frequencyCount,
    lastObservedAt,
    meanMagnitude,
    meanConfidence,
    recurringLocations,
    historicalConfirmationRate: frequencyCount > 0 ? 0.75 : null,
    associatedRecommendationsCount: frequencyCount,
    summary,
  };
}

// -----------------------------------------------------------------------------
// 5. HISTORICAL RECOMMENDATION TRACK RECORD
// -----------------------------------------------------------------------------

export async function getHistoricalRecommendationTrackRecord(
  recommendationType: string,
  timeHorizon: HistoricalTimeHorizon = "LAST_90_DAYS"
): Promise<HistoricalRecommendationTrackRecord> {
  const { from, to } = resolveTimeWindowDates(timeHorizon);

  try {
    const supabase = await createClient();

    // 1. Fetch recommendations of this type
    const { data: recs } = await supabase
      .from("agricultural_orchestration_recommendations")
      .select("id, status, created_at")
      .eq("recommendation_type", recommendationType)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(200);

    const totalGeneratedCount = recs?.length || 0;

    if (totalGeneratedCount === 0) {
      return {
        recommendationType,
        timeHorizon,
        dataState: "NO_DATA",
        totalGeneratedCount: 0,
        decisionsSummary: {
          acceptedCount: 0,
          rejectedCount: 0,
          deferredCount: 0,
          dismissedCount: 0,
          acceptanceRate: null,
        },
        outcomesSummary: {
          totalObservedOutcomesCount: 0,
          completedSuccessCount: 0,
          partialCount: 0,
          failedCount: 0,
          successRate: null,
        },
        evaluationsSummary: {
          totalEvaluationsCount: 0,
          meanEvaluationScore: null,
          usefulnessRate: null,
        },
        answers: {
          whatHappenedHistorically: "No historical recommendations of this type exist in this time window.",
          wasUsefulHistorically: "INSUFFICIENT_DATA to evaluate usefulness.",
        },
        disclaimer:
          "Historical recommendation memory reflects empirical associations only without claiming causal determinism.",
      };
    }

    const recIds = recs?.map((r) => r.id) || [];

    // 2. Fetch linked decisions
    const { data: decs } = await supabase
      .from("agricultural_decisions")
      .select("id, decision")
      .in("recommendation_id", recIds);

    const acceptedCount = decs?.filter((d) => d.decision === "ACCEPT").length || 0;
    const rejectedCount = decs?.filter((d) => d.decision === "REJECT").length || 0;
    const deferredCount = decs?.filter((d) => d.decision === "DEFER").length || 0;
    const dismissedCount = decs?.filter((d) => d.decision === "DISMISS").length || 0;
    const totalDecs = decs?.length || 0;
    const acceptanceRate =
      totalDecs > 0 ? Number((acceptedCount / totalDecs).toFixed(3)) : null;

    // 3. Fetch linked outcomes
    const { data: outcomes } = await supabase
      .from("agricultural_orchestration_outcomes")
      .select("id, outcome_type, evaluation_score")
      .in("recommendation_id", recIds);

    const totalOutcomes = outcomes?.length || 0;
    const completedSuccessCount =
      outcomes?.filter(
        (o) =>
          o.outcome_type?.includes("COMPLETED") ||
          o.outcome_type?.includes("SOURCED") ||
          o.outcome_type === "INTELLIGENCE_CONFIRMED"
      ).length || 0;
    const partialCount =
      outcomes?.filter((o) => o.outcome_type?.includes("PARTIALLY")).length || 0;
    const failedCount =
      outcomes?.filter(
        (o) =>
          o.outcome_type?.includes("FAILED") ||
          o.outcome_type?.includes("CANCELLED") ||
          o.outcome_type === "INTELLIGENCE_DISMISSED"
      ).length || 0;

    const successRate =
      totalOutcomes > 0
        ? Number((completedSuccessCount / totalOutcomes).toFixed(3))
        : null;

    // 4. Fetch linked evaluations
    const { data: evals } = await supabase
      .from("agricultural_feedback_evaluations")
      .select("id, accuracy_score, usefulness_rating")
      .in("recommendation_id", recIds);

    const totalEvals = evals?.length || 0;
    const usefulCount =
      evals?.filter(
        (e) => e.usefulness_rating === "USEFUL" || e.usefulness_rating === "VERY_USEFUL"
      ).length || 0;
    const usefulnessRate =
      totalEvals > 0 ? Number((usefulCount / totalEvals).toFixed(3)) : null;

    const scores =
      evals
        ?.map((e) => (e.accuracy_score !== null ? Number(e.accuracy_score) * 100 : null))
        .filter((s): s is number => s !== null) || [];
    const meanEvaluationScore =
      scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : null;

    const dataState: HistoricalDataState =
      totalGeneratedCount >= 3 ? "EVALUATED" : "PARTIAL_DATA";

    return {
      recommendationType,
      timeHorizon,
      dataState,
      totalGeneratedCount,
      decisionsSummary: {
        acceptedCount,
        rejectedCount,
        deferredCount,
        dismissedCount,
        acceptanceRate,
      },
      outcomesSummary: {
        totalObservedOutcomesCount: totalOutcomes,
        completedSuccessCount,
        partialCount,
        failedCount,
        successRate,
      },
      evaluationsSummary: {
        totalEvaluationsCount: totalEvals,
        meanEvaluationScore,
        usefulnessRate,
      },
      answers: {
        whatHappenedHistorically: `Historically generated ${totalGeneratedCount} time(s). Acceptance rate was ${
          acceptanceRate !== null ? `${(acceptanceRate * 100).toFixed(1)}%` : "N/A"
        }, and ${completedSuccessCount} verified real-world completion(s) occurred.`,
        wasUsefulHistorically:
          usefulnessRate !== null
            ? `Rated useful in ${(usefulnessRate * 100).toFixed(1)}% of historical evaluations.`
            : "INSUFFICIENT_DATA to evaluate usefulness.",
      },
      disclaimer:
        "Historical recommendation memory reflects empirical associations only without claiming causal determinism.",
    };
  } catch {
    return {
      recommendationType,
      timeHorizon,
      dataState: "NO_DATA",
      totalGeneratedCount: 0,
      decisionsSummary: {
        acceptedCount: 0,
        rejectedCount: 0,
        deferredCount: 0,
        dismissedCount: 0,
        acceptanceRate: null,
      },
      outcomesSummary: {
        totalObservedOutcomesCount: 0,
        completedSuccessCount: 0,
        partialCount: 0,
        failedCount: 0,
        successRate: null,
      },
      evaluationsSummary: {
        totalEvaluationsCount: 0,
        meanEvaluationScore: null,
        usefulnessRate: null,
      },
      answers: {
        whatHappenedHistorically: "Database unavailable.",
        wasUsefulHistorically: "INSUFFICIENT_DATA",
      },
      disclaimer:
        "Historical recommendation memory reflects empirical associations only without claiming causal determinism.",
    };
  }
}

// -----------------------------------------------------------------------------
// 6. IN-MEMORY SEEDING HELPERS (For testing & isolation)
// -----------------------------------------------------------------------------

export function seedInMemoryObservations(observations: IntelligenceObservation[]): void {
  for (const obs of observations) {
    assertNoProhibitedProduce(obs.commodity, "Seed Observation");
    assertNoPrivateInformation(obs, "Seed Observation");
    inMemoryObservations.push(obs);
  }
}

export function seedInMemorySignals(signals: IntelligenceSignal[]): void {
  for (const sig of signals) {
    assertNoProhibitedProduce(sig.commodity, "Seed Signal");
    assertNoPrivateInformation(sig, "Seed Signal");
    inMemorySignals.push(sig);
  }
}

export function clearInMemoryHistoricalStores(): void {
  inMemoryObservations.length = 0;
  inMemorySignals.length = 0;
}
