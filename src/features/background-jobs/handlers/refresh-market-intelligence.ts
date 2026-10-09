/**
 * AgroMarket Phase 3.17: Refresh Market Intelligence Handler
 * Deterministically recalculates market trends and projections from recorded data.
 * Never fabricates synthetic observations or simulated prices.
 */

import {
  JobHandler,
  JobExecutionContext,
  JobExecutionResult,
  RefreshMarketIntelligencePayload,
} from "../types";
import { refreshMarketIntelligencePayloadSchema, assertNoProhibitedProduceBackgroundJob } from "../validation";
import { calculateCommodityPriceTrend } from "@/features/market-intelligence/calculations";
import { getAdminClientSafely } from "../data-layer";

export class RefreshMarketIntelligenceHandler
  implements JobHandler<RefreshMarketIntelligencePayload, { commodity: string; state: string; refreshedAt: string; observationsProcessed: number; trendDirection: string }>
{
  readonly jobType = "REFRESH_MARKET_INTELLIGENCE" as const;

  async execute(
    payload: RefreshMarketIntelligencePayload,
    context: JobExecutionContext
  ): Promise<JobExecutionResult<{ commodity: string; state: string; refreshedAt: string; observationsProcessed: number; trendDirection: string }>> {
    const parsed = refreshMarketIntelligencePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        errorCategory: "VALIDATION_FAILED",
        errorMessage: parsed.error.issues.map((i) => i.message).join(", "),
        retryable: false,
      };
    }

    const { commodity, state } = parsed.data;

    // Strict Anti-Pork Assertion
    assertNoProhibitedProduceBackgroundJob(commodity, "Refresh Market Intelligence Commodity");

    const supabase = getAdminClientSafely();

    const observations: Array<{
      id: string;
      commodity: string;
      state: string;
      price: number;
      unit: string;
      observedAt: string;
      marketName: string;
    }> = [];

    if (supabase) {
      const { data, error } = await supabase
        .from("price_observations")
        .select("id, commodity, state, price, unit, observed_at, market_name")
        .ilike("commodity", `%${commodity}%`)
        .eq("state", state)
        .order("observed_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        observations.push(
          ...data.map((r) => ({
            id: r.id,
            commodity: r.commodity,
            state: r.state,
            price: Number(r.price),
            unit: r.unit || "KG",
            observedAt: r.observed_at,
            marketName: r.market_name || "Regional Market",
          }))
        );
      }
    }

    // Deterministic calculation from recorded observations
    const trend = calculateCommodityPriceTrend({
      commodity,
      state,
      observations,
      targetUnit: "KG",
    });

    return {
      success: true,
      result: {
        commodity,
        state,
        refreshedAt: context.now.toISOString(),
        observationsProcessed: observations.length,
        trendDirection: trend.trendDirection,
      },
    };
  }
}
