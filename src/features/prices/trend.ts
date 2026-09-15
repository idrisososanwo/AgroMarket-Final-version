import {
  DataSufficiency,
  PriceObservation,
  PriceTrendDirection,
  PriceTrendResult,
} from "./types";

export interface CalculateTrendParams {
  productId: string;
  state?: string;
  observations: PriceObservation[];
  periodDays?: number; // default 30
  targetUnit?: string; // e.g. "KG" or specific unit
}

/**
 * Deterministically calculates price movement trends over a defined observation window
 * by comparing the recent period against the immediately preceding period.
 *
 * Example (30 days):
 *   Current window: [Now - 30 days, Now]
 *   Previous window: [Now - 60 days, Now - 30 days]
 */
export function calculatePriceTrend(params: CalculateTrendParams): PriceTrendResult {
  const { productId, state, observations, periodDays = 30, targetUnit = "KG" } = params;

  // Filter observations matching the product, state, and comparable unit
  const relevant = observations.filter((obs) => {
    if (obs.productId !== productId) return false;
    if (state && obs.state.toLowerCase() !== state.toLowerCase()) return false;

    // Use normalized price if targetUnit is a canonical base unit (e.g. KG or LITRE)
    if (targetUnit === "KG" || targetUnit === "LITRE") {
      return obs.normalizedUnit === targetUnit && obs.normalizedPrice !== null;
    }
    return obs.unit.toLowerCase() === targetUnit.toLowerCase();
  });

  if (relevant.length === 0) {
    return {
      productId,
      state,
      trend: "INSUFFICIENT_DATA",
      percentageChange: null,
      periodDays,
      currentPeriodAvg: null,
      previousPeriodAvg: null,
      observationCount: 0,
      lastObservedAt: null,
      dataSufficiency: "LOW_DATA",
      unit: targetUnit,
      currency: "NGN",
    };
  }

  // Sort descending by observedAt
  relevant.sort(
    (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
  );

  const now = Date.now();
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const currentWindowStart = now - periodMs;
  const prevWindowStart = now - periodMs * 2;

  const currentPeriodPrices: number[] = [];
  const prevPeriodPrices: number[] = [];

  for (const obs of relevant) {
    const timestamp = new Date(obs.observedAt).getTime();
    const effectivePrice =
      (targetUnit === "KG" || targetUnit === "LITRE") && obs.normalizedPrice !== null
        ? obs.normalizedPrice
        : obs.price;

    if (timestamp >= currentWindowStart && timestamp <= now) {
      currentPeriodPrices.push(effectivePrice);
    } else if (timestamp >= prevWindowStart && timestamp < currentWindowStart) {
      prevPeriodPrices.push(effectivePrice);
    }
  }

  const observationCount = relevant.length;
  const lastObservedAt = relevant[0]?.observedAt ?? null;

  // Evaluate data sufficiency
  let dataSufficiency: DataSufficiency = "LOW_DATA";
  if (currentPeriodPrices.length >= 10) {
    dataSufficiency = "HIGHER_CONFIDENCE";
  } else if (currentPeriodPrices.length >= 3) {
    dataSufficiency = "MODERATE";
  }

  // If there are no current prices or no previous prices, we cannot compute a percentage delta
  if (currentPeriodPrices.length === 0 || prevPeriodPrices.length === 0) {
    const currentAvg =
      currentPeriodPrices.length > 0
        ? Number(
            (
              currentPeriodPrices.reduce((sum, p) => sum + p, 0) /
              currentPeriodPrices.length
            ).toFixed(2)
          )
        : null;

    return {
      productId,
      state,
      trend: "INSUFFICIENT_DATA",
      percentageChange: null,
      periodDays,
      currentPeriodAvg: currentAvg,
      previousPeriodAvg: null,
      observationCount,
      lastObservedAt,
      dataSufficiency,
      unit: targetUnit,
      currency: "NGN",
    };
  }

  const currentAvg =
    currentPeriodPrices.reduce((sum, p) => sum + p, 0) / currentPeriodPrices.length;
  const prevAvg =
    prevPeriodPrices.reduce((sum, p) => sum + p, 0) / prevPeriodPrices.length;

  // Safe division check against zero
  if (prevAvg <= 0) {
    return {
      productId,
      state,
      trend: "INSUFFICIENT_DATA",
      percentageChange: null,
      periodDays,
      currentPeriodAvg: Number(currentAvg.toFixed(2)),
      previousPeriodAvg: Number(prevAvg.toFixed(2)),
      observationCount,
      lastObservedAt,
      dataSufficiency,
      unit: targetUnit,
      currency: "NGN",
    };
  }

  const percentageChangeRaw = ((currentAvg - prevAvg) / prevAvg) * 100;
  const percentageChange = Number(percentageChangeRaw.toFixed(1));

  let trend: PriceTrendDirection = "STABLE";
  if (percentageChange > 2.0) {
    trend = "RISING";
  } else if (percentageChange < -2.0) {
    trend = "FALLING";
  } else {
    trend = "STABLE";
  }

  return {
    productId,
    state,
    trend,
    percentageChange,
    periodDays,
    currentPeriodAvg: Number(currentAvg.toFixed(2)),
    previousPeriodAvg: Number(prevAvg.toFixed(2)),
    observationCount,
    lastObservedAt,
    dataSufficiency,
    unit: targetUnit,
    currency: "NGN",
  };
}
