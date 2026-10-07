/**
 * AgroMarket Phase 3.6: Forecasting Data-Access Layer
 * Server-side persistence, query methods, and testing stores for multi-horizon forecasts.
 */

import { createClient } from "@/lib/supabase/server";
import {
  ForecastDomain,
  ForecastStatus,
  ForecastTimeHorizon,
  MultiHorizonForecast,
} from "./types";
import {
  assertNoPrivateInformation,
  assertNoProhibitedProduce,
} from "./validation";

// In-memory fallback store for offline/test environments
const inMemoryForecasts: MultiHorizonForecast[] = [];

// -----------------------------------------------------------------------------
// 1. SAVE FORECAST (Insert new forecast record or version)
// -----------------------------------------------------------------------------

export async function saveForecast(
  forecast: MultiHorizonForecast
): Promise<MultiHorizonForecast> {
  assertNoProhibitedProduce(forecast.commodity, "Save Forecast");
  assertNoPrivateInformation(forecast, "Save Forecast");

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_intelligence_predictions")
      .insert({
        id: forecast.id,
        agent_id: forecast.agentId,
        commodity: forecast.commodity,
        category: forecast.category || null,
        state: forecast.state,
        lga: forecast.lga || null,
        metric_name: forecast.metricName,
        domain: forecast.domain,
        time_horizon: forecast.timeHorizon,
        forecast_start_date: forecast.forecastStartDate,
        forecast_end_date: forecast.forecastEndDate,
        direction: forecast.direction,
        baseline_value: forecast.baselineValue,
        predicted_value: forecast.predictedValue,
        predicted_range_low: forecast.predictedRangeLow,
        predicted_range_high: forecast.predictedRangeHigh,
        confidence: forecast.confidence,
        confidence_level: forecast.confidenceLevel,
        sample_size: forecast.sampleSize,
        data_completeness: forecast.dataCompleteness,
        baseline_id: forecast.baselineId || null,
        evidence: forecast.evidence as unknown as Record<string, unknown>[],
        method_name: forecast.methodName,
        version: forecast.version,
        previous_forecast_id: forecast.previousForecastId || null,
        evaluation_status: forecast.evaluationStatus,
        error_metrics: (forecast.errorMetrics as unknown as Record<string, unknown>) || {},
        target_date: forecast.targetDate,
        status: forecast.status,
        created_at: forecast.createdAt,
      });

    if (error) {
      inMemoryForecasts.push(forecast);
    }
  } catch {
    inMemoryForecasts.push(forecast);
  }

  return forecast;
}

// -----------------------------------------------------------------------------
// 2. GET FORECAST BY ID
// -----------------------------------------------------------------------------

export async function getForecastById(id: string): Promise<MultiHorizonForecast | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_predictions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return inMemoryForecasts.find((f) => f.id === id) || null;
    }

    return mapDatabaseRowToForecast(data);
  } catch {
    return inMemoryForecasts.find((f) => f.id === id) || null;
  }
}

// -----------------------------------------------------------------------------
// 3. GET FORECASTS BY COMMODITY
// -----------------------------------------------------------------------------

export async function getForecastsByCommodity(
  commodity: string,
  horizon?: ForecastTimeHorizon
): Promise<MultiHorizonForecast[]> {
  assertNoProhibitedProduce(commodity, "Query Forecasts By Commodity");

  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_predictions")
      .select("*")
      .ilike("commodity", `%${commodity}%`)
      .order("created_at", { ascending: false });

    if (horizon) {
      query = query.eq("time_horizon", horizon);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return inMemoryForecasts.filter(
        (f) =>
          f.commodity.toLowerCase().includes(commodity.toLowerCase()) &&
          (!horizon || f.timeHorizon === horizon)
      );
    }

    return data.map(mapDatabaseRowToForecast);
  } catch {
    return inMemoryForecasts.filter(
      (f) =>
        f.commodity.toLowerCase().includes(commodity.toLowerCase()) &&
        (!horizon || f.timeHorizon === horizon)
    );
  }
}

// -----------------------------------------------------------------------------
// 4. GET FORECASTS BY DOMAIN
// -----------------------------------------------------------------------------

export async function getForecastsByDomain(
  domain: ForecastDomain,
  horizon?: ForecastTimeHorizon
): Promise<MultiHorizonForecast[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_predictions")
      .select("*")
      .eq("domain", domain)
      .order("created_at", { ascending: false });

    if (horizon) {
      query = query.eq("time_horizon", horizon);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return inMemoryForecasts.filter(
        (f) => f.domain === domain && (!horizon || f.timeHorizon === horizon)
      );
    }

    return data.map(mapDatabaseRowToForecast);
  } catch {
    return inMemoryForecasts.filter(
      (f) => f.domain === domain && (!horizon || f.timeHorizon === horizon)
    );
  }
}

// -----------------------------------------------------------------------------
// 5. GET FORECAST HISTORY (LINEAGE & VERSIONS)
// -----------------------------------------------------------------------------

export async function getForecastHistory(
  commodity: string,
  state: string,
  horizon?: ForecastTimeHorizon
): Promise<MultiHorizonForecast[]> {
  assertNoProhibitedProduce(commodity, "Forecast History Query");

  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_predictions")
      .select("*")
      .ilike("commodity", `%${commodity}%`)
      .eq("state", state)
      .order("version", { ascending: false });

    if (horizon) {
      query = query.eq("time_horizon", horizon);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return inMemoryForecasts
        .filter(
          (f) =>
            f.commodity.toLowerCase().includes(commodity.toLowerCase()) &&
            f.state === state &&
            (!horizon || f.timeHorizon === horizon)
        )
        .sort((a, b) => b.version - a.version);
    }

    return data.map(mapDatabaseRowToForecast);
  } catch {
    return inMemoryForecasts
      .filter(
        (f) =>
          f.commodity.toLowerCase().includes(commodity.toLowerCase()) &&
          f.state === state &&
          (!horizon || f.timeHorizon === horizon)
      )
      .sort((a, b) => b.version - a.version);
  }
}

// -----------------------------------------------------------------------------
// 6. UPDATE FORECAST STATUS
// -----------------------------------------------------------------------------

export async function updateForecastStatus(
  id: string,
  status: ForecastStatus
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_intelligence_predictions")
      .update({ status })
      .eq("id", id);

    if (!error) return true;
  } catch {
    // continue to fallback
  }

  const mem = inMemoryForecasts.find((f) => f.id === id);
  if (mem) {
    mem.status = status;
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// 7. IN-MEMORY TESTING UTILITIES
// -----------------------------------------------------------------------------

export function seedInMemoryForecasts(forecasts: MultiHorizonForecast[]): void {
  for (const f of forecasts) {
    assertNoProhibitedProduce(f.commodity, "Seed Forecast");
    assertNoPrivateInformation(f, "Seed Forecast");
    inMemoryForecasts.push(f);
  }
}

export function clearInMemoryForecasts(): void {
  inMemoryForecasts.length = 0;
}

// -----------------------------------------------------------------------------
// 8. DATABASE ROW MAPPER
// -----------------------------------------------------------------------------

function mapDatabaseRowToForecast(row: Record<string, unknown>): MultiHorizonForecast {
  return {
    id: String(row.id),
    domain: row.domain as ForecastDomain,
    metricName: String(row.metric_name),
    commodity: String(row.commodity),
    category: row.category ? String(row.category) : null,
    state: String(row.state),
    lga: row.lga ? String(row.lga) : null,
    corridor: null,
    timeHorizon: row.time_horizon as ForecastTimeHorizon,
    forecastPeriodDays: 30,
    forecastStartDate: String(row.forecast_start_date || row.created_at),
    forecastEndDate: String(row.forecast_end_date || row.target_date),
    targetDate: String(row.target_date),

    currentValue: row.baseline_value !== null ? Number(row.baseline_value) : null,
    baselineValue: row.baseline_value !== null ? Number(row.baseline_value) : null,
    predictedValue: row.predicted_value !== null ? Number(row.predicted_value) : null,
    predictedRangeLow: row.predicted_range_low !== null ? Number(row.predicted_range_low) : null,
    predictedRangeHigh: row.predicted_range_high !== null ? Number(row.predicted_range_high) : null,
    expectedDelta:
      row.predicted_value !== null && row.baseline_value !== null
        ? Number((Number(row.predicted_value) - Number(row.baseline_value)).toFixed(2))
        : null,
    expectedPercentageDelta: null,

    direction: (row.direction as MultiHorizonForecast["direction"]) || "UNKNOWN",
    confidence: row.confidence !== null ? Number(row.confidence) : 0.0,
    confidenceLevel: (row.confidence_level as MultiHorizonForecast["confidenceLevel"]) || "MODERATE",

    sampleSize: row.sample_size ? Number(row.sample_size) : 0,
    dataCompleteness: Number(row.data_completeness || 0),
    baselineId: row.baseline_id ? String(row.baseline_id) : null,
    baselineSummary: null,
    methodName: (row.method_name as MultiHorizonForecast["methodName"]) || "HISTORICAL_BASELINE_COMPARISON",
    evidence: (row.evidence as MultiHorizonForecast["evidence"]) || [],

    status: row.status as ForecastStatus,
    version: row.version ? Number(row.version) : 1,
    previousForecastId: row.previous_forecast_id ? String(row.previous_forecast_id) : null,
    evaluationStatus: (row.evaluation_status as MultiHorizonForecast["evaluationStatus"]) || "PENDING",
    errorMetrics: (row.error_metrics as MultiHorizonForecast["errorMetrics"]) || null,

    explanation: `Database retrieved forecast for ${String(row.commodity)}.`,
    limitations: "Advisory analytical intelligence.",
    governanceNote: "Advisory analytical indicator only.",
    agentId: String(row.agent_id || "AGRICULTURAL_INTELLIGENCE_ORCHESTRATION"),
    createdAt: String(row.created_at),
    updatedAt: String(row.created_at),
  };
}
