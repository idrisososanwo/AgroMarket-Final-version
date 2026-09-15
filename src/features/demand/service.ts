import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import {
  DemandForecast,
  GenerateForecastInput,
  generateForecastSchema,
  PlatformDemandSignal,
} from "./types";
import { calculateBaselineDemandForecast } from "./forecasting";
import { getPlatformDemandSignals } from "./signals";
import { resolveCanonicalDemandUnit } from "./units";

export class DemandService {
  /**
   * Generates and persists a deterministic baseline demand forecast for a product and state.
   */
  static async generateBaselineForecast(
    input: GenerateForecastInput,
    actorId: string
  ): Promise<DemandForecast> {
    const validated = generateForecastSchema.parse(input);
    const admin = createAdminClient();

    // 1. Verify canonical product
    const { data: product, error: prodErr } = await admin
      .from("products")
      .select("id, name, default_unit, is_active")
      .eq("id", validated.productId)
      .single();

    if (prodErr || !product || !product.is_active) {
      throw new Error("Canonical agricultural product not found or inactive.");
    }

    const rawDefaultUnit = product.default_unit || "KG";
    const canonicalUnit = resolveCanonicalDemandUnit(rawDefaultUnit);

    // 2. Query historical orders within dataWindowDays
    const windowStart = new Date(
      Date.now() - validated.dataWindowDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: orderItems } = await admin
      .from("order_items")
      .select(`
        id, quantity, unit_snapshot, created_at,
        orders!inner (id, status, delivery_state)
      `)
      .eq("product_id", validated.productId)
      .eq("orders.delivery_state", validated.regionState)
      .gte("created_at", windowStart)
      .not("orders.status", "eq", "CANCELLED");

    const historicalOrders = (orderItems || []).map((item) => ({
      quantity: Number(item.quantity),
      unit: item.unit_snapshot || rawDefaultUnit,
      createdAt: item.created_at,
    }));

    // 3. Compute baseline forecast with canonical unit
    const forecastResult = calculateBaselineDemandForecast({
      productId: validated.productId,
      regionState: validated.regionState,
      historicalOrders,
      dataWindowDays: validated.dataWindowDays,
      forecastHorizonDays: validated.forecastHorizonDays,
      volumeUnit: canonicalUnit,
    });

    const periodStartDate = new Date().toISOString().split("T")[0];
    const periodEndDate = new Date(
      Date.now() + validated.forecastHorizonDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    // 4. Persist to public.demand_forecasts
    const { data: inserted, error: insErr } = await admin
      .from("demand_forecasts")
      .insert({
        product_id: validated.productId,
        region_state: validated.regionState,
        period_start: periodStartDate,
        period_end: periodEndDate,
        predicted_demand_volume: forecastResult.predictedDemandVolume,
        volume_unit: canonicalUnit,
        confidence_score: forecastResult.confidenceScore,
        confidence_level: forecastResult.confidenceLevel,
        forecast_method: forecastResult.method,
        forecast_horizon_days: validated.forecastHorizonDays,
        data_window_days: validated.dataWindowDays,
        data_quality_label:
          forecastResult.confidenceLevel === "INSUFFICIENT_DATA"
            ? "SIMULATED"
            : "ESTIMATED",
        model_metadata: forecastResult.metadata as Record<string, unknown>,
      })
      .select(`
        id, product_id, region_state, period_start, period_end,
        predicted_demand_volume, volume_unit, confidence_score,
        confidence_level, forecast_method, forecast_horizon_days,
        data_window_days, data_quality_label, model_metadata, created_at
      `)
      .single();

    if (insErr || !inserted) {
      throw new Error(`Failed to store demand forecast: ${insErr?.message}`);
    }

    await recordAuditLog({
      actorId,
      action: "DEMAND_FORECAST_GENERATED",
      resourceType: "DEMAND_FORECAST",
      resourceId: inserted.id,
      newValues: {
        productId: inserted.product_id,
        regionState: inserted.region_state,
        predictedDemandVolume: inserted.predicted_demand_volume,
        confidenceLevel: inserted.confidence_level,
      },
    });

    return {
      id: inserted.id,
      productId: inserted.product_id,
      productName: product.name,
      regionState: inserted.region_state,
      periodStart: inserted.period_start,
      periodEnd: inserted.period_end,
      predictedDemandVolume: Number(inserted.predicted_demand_volume),
      volumeUnit: inserted.volume_unit,
      confidenceScore: inserted.confidence_score !== null ? Number(inserted.confidence_score) : null,
      confidenceLevel: inserted.confidence_level,
      forecastMethod: inserted.forecast_method,
      forecastHorizonDays: inserted.forecast_horizon_days,
      dataWindowDays: inserted.data_window_days,
      dataQualityLabel: inserted.data_quality_label,
      modelMetadata: (inserted.model_metadata as Record<string, unknown>) || {},
      createdAt: inserted.created_at,
    };
  }

  /**
   * Retrieves stored demand forecasts matching optional product and state filters.
   */
  static async getForecasts(
    productId?: string,
    regionState?: string
  ): Promise<DemandForecast[]> {
    const admin = createAdminClient();

    let query = admin
      .from("demand_forecasts")
      .select(`
        id, product_id, region_state, period_start, period_end,
        predicted_demand_volume, volume_unit, confidence_score,
        confidence_level, forecast_method, forecast_horizon_days,
        data_window_days, data_quality_label, model_metadata, created_at,
        products!inner (name)
      `)
      .order("created_at", { ascending: false })
      .limit(30);

    if (productId) {
      query = query.eq("product_id", productId);
    }
    if (regionState) {
      query = query.eq("region_state", regionState);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    type ForecastRow = {
      id: string;
      product_id: string;
      region_state: string;
      period_start: string;
      period_end: string;
      predicted_demand_volume: number;
      volume_unit: string;
      confidence_score: number | null;
      confidence_level: DemandForecast["confidenceLevel"];
      forecast_method: string;
      forecast_horizon_days: number;
      data_window_days: number;
      data_quality_label: DemandForecast["dataQualityLabel"];
      model_metadata: Record<string, unknown>;
      created_at: string;
      products?: { name?: string };
    };

    return (data as unknown as ForecastRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.products?.name,
      regionState: row.region_state,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      predictedDemandVolume: Number(row.predicted_demand_volume),
      volumeUnit: row.volume_unit,
      confidenceScore: row.confidence_score !== null ? Number(row.confidence_score) : null,
      confidenceLevel: row.confidence_level,
      forecastMethod: row.forecast_method,
      forecastHorizonDays: row.forecast_horizon_days,
      dataWindowDays: row.data_window_days,
      dataQualityLabel: row.data_quality_label,
      modelMetadata: row.model_metadata || {},
      createdAt: row.created_at,
    }));
  }

  /**
   * Retrieves platform demand signals.
   */
  static async getSignals(productId: string, regionState?: string): Promise<PlatformDemandSignal> {
    return getPlatformDemandSignals(productId, regionState);
  }
}
