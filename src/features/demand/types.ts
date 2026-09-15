import { z } from "zod";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";

export type ForecastConfidenceLevel = "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA";

export type ForecastMethod = "MOVING_AVERAGE_30D" | "HISTORICAL_WEIGHTED";

export interface PlatformDemandSignal {
  productId: string;
  productName?: string;
  regionState?: string;
  orderCount30Days: number;
  totalQuantitySold30Days: number;
  activeCartItemsCount: number;
  activeListingsCount: number;
  unit: string;
  lastOrderAt: string | null;
  signalConfidence: "HIGH" | "MODERATE" | "LOW_DATA";
  telemetryNotes: string[];
}

export interface DemandForecast {
  id: string;
  productId: string;
  productName?: string;
  regionState: string;
  periodStart: string;
  periodEnd: string;
  predictedDemandVolume: number;
  volumeUnit: string;
  confidenceScore: number | null;
  confidenceLevel: ForecastConfidenceLevel;
  forecastMethod: string;
  forecastHorizonDays: number;
  dataWindowDays: number;
  dataQualityLabel: "ESTIMATED" | "SIMULATED" | "OBSERVED";
  modelMetadata: {
    historicalWindowStart?: string;
    historicalWindowEnd?: string;
    totalHistoricalVolume?: number;
    dailyAverageVolume?: number;
    sampleOrderCount?: number;
    methodExplanation?: string;
    limitationsNote?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

export const generateForecastSchema = z.object({
  productId: z.string().uuid("Invalid canonical product ID"),
  regionState: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  forecastHorizonDays: z.number().int().min(1).max(30).default(7),
  dataWindowDays: z.number().int().min(7).max(90).default(30),
});

export type GenerateForecastInput = z.infer<typeof generateForecastSchema>;
