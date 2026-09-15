import { ForecastConfidenceLevel } from "./types";
import { normalizeDemandQuantity, resolveCanonicalDemandUnit } from "./units";

export interface ForecastCalculationInput {
  productId: string;
  regionState: string;
  historicalOrders: Array<{
    quantity: number;
    unit?: string;
    createdAt: string;
  }>;
  dataWindowDays: number; // e.g. 30
  forecastHorizonDays: number; // e.g. 7
  volumeUnit: string;
}

export interface ForecastCalculationResult {
  predictedDemandVolume: number;
  confidenceScore: number;
  confidenceLevel: ForecastConfidenceLevel;
  method: string;
  metadata: {
    historicalWindowStart: string;
    historicalWindowEnd: string;
    dataWindowDays: number;
    forecastHorizonDays: number;
    totalHistoricalVolume: number;
    dailyAverageVolume: number;
    sampleOrderCount: number;
    incompatibleOrderCount?: number;
    canonicalUnit: string;
    methodExplanation: string;
    limitationsNote: string;
  };
}

/**
 * Calculates a transparent, deterministic baseline demand forecast using historical
 * order volume moving averages.
 *
 * Enforces unit consistency:
 * - Compatible packaging (e.g. 20 x 50kg bag + 500kg + 10 x 25kg bag) normalizes to canonical volume.
 * - Incompatible units (e.g. crate vs kg) are excluded from volume aggregation without inventing conversions.
 * - Strictly avoids pseudo-scientific AI claims; provides clear metadata documenting
 *   sample counts, window bounds, and data sufficiency limits.
 */
export function calculateBaselineDemandForecast(
  input: ForecastCalculationInput
): ForecastCalculationResult {
  const {
    historicalOrders,
    dataWindowDays,
    forecastHorizonDays,
    volumeUnit,
  } = input;

  const now = new Date();
  const windowStart = new Date(now.getTime() - dataWindowDays * 24 * 60 * 60 * 1000);

  const canonicalTargetUnit = resolveCanonicalDemandUnit(volumeUnit);

  let totalVolume = 0;
  let validOrderCount = 0;
  let incompatibleOrderCount = 0;

  for (const order of historicalOrders) {
    if (order.unit) {
      const norm = normalizeDemandQuantity(
        Number(order.quantity),
        order.unit,
        canonicalTargetUnit
      );
      if (norm.isCompatible && norm.normalizedQuantity !== null) {
        totalVolume += norm.normalizedQuantity;
        validOrderCount++;
      } else {
        incompatibleOrderCount++;
      }
    } else {
      // If unit is omitted, assume already expressed in canonicalTargetUnit
      totalVolume += Number(order.quantity);
      validOrderCount++;
    }
  }

  // Edge case: No compatible historical transactions in this window
  if (validOrderCount === 0 || totalVolume <= 0) {
    return {
      predictedDemandVolume: 0,
      confidenceScore: 0.1,
      confidenceLevel: "INSUFFICIENT_DATA",
      method: "MOVING_AVERAGE_30D",
      metadata: {
        historicalWindowStart: windowStart.toISOString(),
        historicalWindowEnd: now.toISOString(),
        dataWindowDays,
        forecastHorizonDays,
        totalHistoricalVolume: 0,
        dailyAverageVolume: 0,
        sampleOrderCount: 0,
        incompatibleOrderCount,
        canonicalUnit: canonicalTargetUnit,
        methodExplanation:
          "Baseline forecast based on 30-day historical moving average of completed platform orders.",
        limitationsNote:
          incompatibleOrderCount > 0
            ? `Insufficient compatible historical transactions recorded in ${canonicalTargetUnit} (${incompatibleOrderCount} order item(s) had incompatible packaging and could not be converted). Forecast is unavailable.`
            : "Insufficient historical transactions recorded for this commodity and region on AgroMarket. Forecast is unavailable.",
      },
    };
  }

  // Daily average volume over the sampling window
  const dailyAverage = totalVolume / dataWindowDays;
  const predictedVolume = Number((dailyAverage * forecastHorizonDays).toFixed(2));

  // Determine statistical confidence level based on valid data density
  let confidenceLevel: ForecastConfidenceLevel = "LOW";
  let confidenceScore = 0.4;

  if (validOrderCount >= 10) {
    confidenceLevel = "HIGH";
    confidenceScore = 0.85;
  } else if (validOrderCount >= 3) {
    confidenceLevel = "MEDIUM";
    confidenceScore = 0.65;
  }

  let limitationsNote =
    "Baseline demand forecasts are statistical estimates based on available AgroMarket activity and are not guaranteed predictions. Weather variations, seasonal macroeconomic shocks, and off-platform commerce may impact real market demand.";

  if (incompatibleOrderCount > 0) {
    limitationsNote += ` (${incompatibleOrderCount} order item(s) in incompatible packaging units were safely excluded from ${canonicalTargetUnit} volume aggregation).`;
  }

  return {
    predictedDemandVolume: predictedVolume,
    confidenceScore,
    confidenceLevel,
    method: "MOVING_AVERAGE_30D",
    metadata: {
      historicalWindowStart: windowStart.toISOString(),
      historicalWindowEnd: now.toISOString(),
      dataWindowDays,
      forecastHorizonDays,
      totalHistoricalVolume: Number(totalVolume.toFixed(2)),
      dailyAverageVolume: Number(dailyAverage.toFixed(2)),
      sampleOrderCount: validOrderCount,
      incompatibleOrderCount,
      canonicalUnit: canonicalTargetUnit,
      methodExplanation: `Baseline forecast derived from ${dataWindowDays}-day moving average of confirmed AgroMarket sales volume (${Number(totalVolume.toFixed(2))} ${canonicalTargetUnit}), projected forward for ${forecastHorizonDays} days.`,
      limitationsNote,
    },
  };
}
