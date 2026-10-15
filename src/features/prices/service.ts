import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import {
  CreatePriceObservationInput,
  createPriceObservationSchema,
  PriceAggregation,
  PriceObservation,
  PriceQueryFilter,
  PriceTrendResult,
  RegionalPriceComparison,
  StatePriceSummary,
} from "./types";
import { normalizePrice, calculateTradeUnitEquivalent } from "./normalization";
import { calculatePriceTrend } from "./trend";

export class PriceService {
  /**
   * Records a new price observation into the append-only registry.
   * Strictly verifies produce, state, unit, normalizes units, and enforces authorization.
   */
  static async recordObservation(
    input: CreatePriceObservationInput,
    reporterId: string,
    isAdmin = false
  ): Promise<PriceObservation> {
    const validated = createPriceObservationSchema.parse(input);
    const admin = createAdminClient();

    // 1. Verify canonical product exists and is active
    const { data: product, error: prodErr } = await admin
      .from("products")
      .select("id, name, is_active")
      .eq("id", validated.productId)
      .single();

    if (prodErr || !product) {
      throw new Error("Canonical agricultural product not found.");
    }

    if (!product.is_active) {
      throw new Error("Cannot record price observation for an inactive product.");
    }

    // 2. Strict anti-pork check
    const prohibitedRegex = /\b(pork|pig|swine|bacon|ham|lard)\b/i;
    if (prohibitedRegex.test(product.name)) {
      throw new Error("Prohibited product violated safety policy.");
    }

    // 3. Deterministic unit normalization
    const normalization = normalizePrice(validated.price, validated.unit);

    // 4. Determine verification and quality attributes
    const verificationStatus = isAdmin ? "VERIFIED" : "SELF_REPORTED";
    const dataQualityLabel = isAdmin ? "VERIFIED" : "OBSERVED";
    const confidenceScore = isAdmin ? 0.9 : 0.6;

    const observationDate = validated.observedAt || new Date().toISOString();

    // 5. Append-only insert
    const { data: inserted, error: insErr } = await admin
      .from("price_observations")
      .insert({
        product_id: validated.productId,
        market_name: validated.marketName,
        state: validated.state,
        lga: validated.lga || null,
        price: validated.price,
        currency: "NGN",
        unit: validated.unit,
        normalized_price: normalization.normalizedPrice,
        normalized_unit: normalization.normalizedUnit,
        normalization_status: normalization.status,
        source_type: validated.sourceType,
        reported_by: reporterId,
        verification_status: verificationStatus,
        confidence_score: confidenceScore,
        data_quality_label: dataQualityLabel,
        observed_at: observationDate,
        metadata: (validated.metadata as Record<string, unknown>) || {},
      })
      .select(`
        id, product_id, market_name, state, lga, price, currency, unit,
        normalized_price, normalized_unit, normalization_status,
        source_type, reported_by, verification_status, confidence_score,
        data_quality_label, observed_at, metadata, created_at
      `)
      .single();

    if (insErr || !inserted) {
      throw new Error(`Failed to record price observation: ${insErr?.message}`);
    }

    await recordAuditLog({
      actorId: reporterId,
      action: "PRICE_OBSERVATION_RECORDED",
      resourceType: "PRICE_OBSERVATION",
      resourceId: inserted.id,
      newValues: {
        productId: inserted.product_id,
        price: inserted.price,
        unit: inserted.unit,
        state: inserted.state,
        verificationStatus: inserted.verification_status,
      },
      metadata: {
        isAdmin,
      },
    });

    return {
      id: inserted.id,
      productId: inserted.product_id,
      productName: product.name,
      marketName: inserted.market_name,
      state: inserted.state,
      lga: inserted.lga,
      price: Number(inserted.price),
      currency: inserted.currency,
      unit: inserted.unit,
      normalizedPrice: inserted.normalized_price !== null ? Number(inserted.normalized_price) : null,
      normalizedUnit: inserted.normalized_unit,
      normalizationStatus: inserted.normalization_status,
      sourceType: inserted.source_type as PriceObservation["sourceType"],
      reportedBy: inserted.reported_by,
      verificationStatus: inserted.verification_status,
      confidenceScore: inserted.confidence_score !== null ? Number(inserted.confidence_score) : null,
      dataQualityLabel: inserted.data_quality_label,
      observedAt: inserted.observed_at,
      metadata: (inserted.metadata as Record<string, unknown>) || {},
      createdAt: inserted.created_at,
    };
  }

  /**
   * Retrieves latest price observations matching provided filters.
   */
  static async getLatestPrices(filter: PriceQueryFilter = {}): Promise<PriceObservation[]> {
    const admin = createAdminClient();

    let query = admin
      .from("price_observations")
      .select(`
        id, product_id, market_name, state, lga, price, currency, unit,
        normalized_price, normalized_unit, normalization_status,
        source_type, reported_by, verification_status, confidence_score,
        data_quality_label, observed_at, metadata, created_at,
        products!inner (id, name)
      `)
      .order("observed_at", { ascending: false })
      .limit(filter.limit || 50);

    if (filter.productId) {
      query = query.eq("product_id", filter.productId);
    }
    if (filter.state) {
      query = query.eq("state", filter.state);
    }
    if (filter.lga) {
      query = query.eq("lga", filter.lga);
    }
    if (filter.sourceType) {
      query = query.eq("source_type", filter.sourceType);
    }
    if (filter.verificationStatus) {
      query = query.eq("verification_status", filter.verificationStatus);
    }
    if (filter.dataQualityLabel) {
      query = query.eq("data_quality_label", filter.dataQualityLabel);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    type ObservationQueryRow = {
      id: string;
      product_id: string;
      market_name: string;
      state: string;
      lga: string | null;
      price: number;
      currency: string;
      unit: string;
      normalized_price: number | null;
      normalized_unit: string | null;
      normalization_status: PriceObservation["normalizationStatus"];
      source_type: PriceObservation["sourceType"];
      reported_by: string | null;
      verification_status: PriceObservation["verificationStatus"];
      confidence_score: number | null;
      data_quality_label: PriceObservation["dataQualityLabel"];
      observed_at: string;
      metadata: Record<string, unknown>;
      created_at: string;
      products?: { id?: string; name?: string };
    };

    return (data as unknown as ObservationQueryRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.products?.name,
      marketName: row.market_name,
      state: row.state,
      lga: row.lga,
      price: Number(row.price),
      currency: row.currency,
      unit: row.unit,
      normalizedPrice: row.normalized_price !== null ? Number(row.normalized_price) : null,
      normalizedUnit: row.normalized_unit,
      normalizationStatus: row.normalization_status,
      sourceType: row.source_type,
      reportedBy: row.reported_by,
      verificationStatus: row.verification_status,
      confidenceScore: row.confidence_score !== null ? Number(row.confidence_score) : null,
      dataQualityLabel: row.data_quality_label,
      observedAt: row.observed_at,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at,
    }));
  }

  /**
   * Retrieves append-only historical observations for a product within a window of days.
   */
  static async getPriceHistory(
    productId: string,
    state?: string,
    days = 90
  ): Promise<PriceObservation[]> {
    const admin = createAdminClient();
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = admin
      .from("price_observations")
      .select(`
        id, product_id, market_name, state, lga, price, currency, unit,
        normalized_price, normalized_unit, normalization_status,
        source_type, reported_by, verification_status, confidence_score,
        data_quality_label, observed_at, metadata, created_at,
        products!inner (id, name)
      `)
      .eq("product_id", productId)
      .gte("observed_at", sinceDate)
      .order("observed_at", { ascending: true });

    if (state) {
      query = query.eq("state", state);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    type ObservationHistoryRow = {
      id: string;
      product_id: string;
      market_name: string;
      state: string;
      lga: string | null;
      price: number;
      currency: string;
      unit: string;
      normalized_price: number | null;
      normalized_unit: string | null;
      normalization_status: PriceObservation["normalizationStatus"];
      source_type: PriceObservation["sourceType"];
      reported_by: string | null;
      verification_status: PriceObservation["verificationStatus"];
      confidence_score: number | null;
      data_quality_label: PriceObservation["dataQualityLabel"];
      observed_at: string;
      metadata: Record<string, unknown>;
      created_at: string;
      products?: { id?: string; name?: string };
    };

    return (data as unknown as ObservationHistoryRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.products?.name,
      marketName: row.market_name,
      state: row.state,
      lga: row.lga,
      price: Number(row.price),
      currency: row.currency,
      unit: row.unit,
      normalizedPrice: row.normalized_price !== null ? Number(row.normalized_price) : null,
      normalizedUnit: row.normalized_unit,
      normalizationStatus: row.normalization_status,
      sourceType: row.source_type,
      reportedBy: row.reported_by,
      verificationStatus: row.verification_status,
      confidenceScore: row.confidence_score !== null ? Number(row.confidence_score) : null,
      dataQualityLabel: row.data_quality_label,
      observedAt: row.observed_at,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at,
    }));
  }

  /**
   * Generates a deterministic price trend for a product.
   */
  static async getPriceTrend(
    productId: string,
    state?: string,
    periodDays = 30
  ): Promise<PriceTrendResult> {
    const history = await this.getPriceHistory(productId, state, periodDays * 2);
    return calculatePriceTrend({
      productId,
      state,
      observations: history,
      periodDays,
      targetUnit: "KG",
    });
  }

  /**
   * Computes regional price comparisons across all Nigerian states for a given product.
   */
  static async getRegionalPriceComparison(productId: string): Promise<RegionalPriceComparison> {
    const admin = createAdminClient();

    // Fetch product name
    const { data: product } = await admin
      .from("products")
      .select("id, name, default_unit")
      .eq("id", productId)
      .single();

    const productName = product?.name || "Agricultural Commodity";

    // Fetch observations for this product from the past 60 days
    const sinceDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await admin
      .from("price_observations")
      .select(`
        id, market_name, state, price, unit, normalized_price, normalized_unit,
        normalization_status, observed_at
      `)
      .eq("product_id", productId)
      .gte("observed_at", sinceDate)
      .order("observed_at", { ascending: false });

    if (!rows || rows.length === 0) {
      return {
        productId,
        productName,
        canonicalUnit: "KG",
        nationalAverage: null,
        dominantTradeUnit: product?.default_unit || "KG",
        dominantTradeUnitAverage: null,
        lowestObserved: null,
        highestObserved: null,
        stateSummaries: [],
        totalObservations: 0,
      };
    }

    // Determine dominant trade unit across observations
    const unitCounts = new Map<string, number>();
    for (const r of rows) {
      unitCounts.set(r.unit, (unitCounts.get(r.unit) || 0) + 1);
    }
    let dominantTradeUnit = rows[0]?.unit || product?.default_unit || "KG";
    let maxCount = 0;
    for (const [u, count] of unitCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantTradeUnit = u;
      }
    }

    // Partition by state
    type StateAggregate = {
      prices: number[];
      markets: string[];
      originalUnits: string[];
      originalUnitPrices: number[];
      canonicalUnits: string[];
      latestDate: string;
    };

    const stateMap = new Map<string, StateAggregate>();

    const allNormalizedPrices: number[] = [];

    for (const r of rows) {
      const priceVal =
        r.normalized_price !== null ? Number(r.normalized_price) : Number(r.price);
      allNormalizedPrices.push(priceVal);

      const existing: StateAggregate = stateMap.get(r.state) || {
        prices: [],
        markets: [],
        originalUnits: [],
        originalUnitPrices: [],
        canonicalUnits: [],
        latestDate: r.observed_at,
      };
      existing.prices.push(priceVal);
      if (!existing.markets.includes(r.market_name)) {
        existing.markets.push(r.market_name);
      }
      if (!existing.originalUnits.includes(r.unit)) {
        existing.originalUnits.push(r.unit);
      }
      existing.originalUnitPrices.push(Number(r.price));
      if (r.normalized_unit && !existing.canonicalUnits.includes(r.normalized_unit)) {
        existing.canonicalUnits.push(r.normalized_unit);
      }
      stateMap.set(r.state, existing);
    }

    const stateSummaries: StatePriceSummary[] = [];

    for (const [st, info] of stateMap.entries()) {
      const avg = Number(
        (info.prices.reduce((sum, p) => sum + p, 0) / info.prices.length).toFixed(2)
      );
      const min = Math.min(...info.prices);
      const max = Math.max(...info.prices);

      let sufficiency: StatePriceSummary["dataSufficiency"] = "LOW_DATA";
      if (info.prices.length >= 10) sufficiency = "HIGHER_CONFIDENCE";
      else if (info.prices.length >= 3) sufficiency = "MODERATE";

      const originalUnit = info.originalUnits[0] || dominantTradeUnit;
      const originalUnitPrice =
        info.originalUnitPrices.length > 0
          ? Number(
              (
                info.originalUnitPrices.reduce((sum, p) => sum + p, 0) /
                info.originalUnitPrices.length
              ).toFixed(0)
            )
          : calculateTradeUnitEquivalent(avg, originalUnit) || undefined;

      stateSummaries.push({
        state: st,
        averagePrice: avg,
        minPrice: min,
        maxPrice: max,
        observationCount: info.prices.length,
        lastObservedAt: info.latestDate,
        dataSufficiency: sufficiency,
        unit: info.canonicalUnits[0] || "KG",
        originalUnit,
        originalUnitPrice,
      });
    }

    // Sort states by average price ascending
    stateSummaries.sort((a, b) => a.averagePrice - b.averagePrice);

    const nationalAverage =
      allNormalizedPrices.length > 0
        ? Number(
            (
              allNormalizedPrices.reduce((sum, p) => sum + p, 0) /
              allNormalizedPrices.length
            ).toFixed(2)
          )
        : null;

    // Dominant trade unit average (e.g. 50kg bag price equivalent)
    const dominantUnitRows = rows.filter((r) => r.unit === dominantTradeUnit);
    const dominantTradeUnitAverage =
      dominantUnitRows.length > 0
        ? Number(
            (
              dominantUnitRows.reduce((sum, r) => sum + Number(r.price), 0) /
              dominantUnitRows.length
            ).toFixed(0)
          )
        : calculateTradeUnitEquivalent(nationalAverage, dominantTradeUnit);

    let lowestObserved = null;
    let highestObserved = null;

    if (stateSummaries.length > 0) {
      const lowestState = stateSummaries[0];
      const highestState = stateSummaries[stateSummaries.length - 1];

      const lowestStateInfo = stateMap.get(lowestState.state);
      const highestStateInfo = stateMap.get(highestState.state);

      lowestObserved = {
        state: lowestState.state,
        price: lowestState.minPrice,
        marketName: lowestStateInfo?.markets[0] || lowestState.state,
        wording: "Lowest observed price among available records",
        originalPrice: lowestStateInfo?.originalUnitPrices[0],
        originalUnit: lowestStateInfo?.originalUnits[0],
      };

      highestObserved = {
        state: highestState.state,
        price: highestState.maxPrice,
        marketName: highestStateInfo?.markets[0] || highestState.state,
        wording: "Highest observed price among available records",
        originalPrice: highestStateInfo?.originalUnitPrices[0],
        originalUnit: highestStateInfo?.originalUnits[0],
      };
    }

    return {
      productId,
      productName,
      canonicalUnit: "KG",
      nationalAverage,
      dominantTradeUnit,
      dominantTradeUnitAverage,
      lowestObserved,
      highestObserved,
      stateSummaries,
      totalObservations: rows.length,
    };
  }

  /**
   * Retrieves active marketplace producer offers for a product.
   * Enables the market intelligence view to display live producer offers
   * side-by-side with historical or surveyed wholesale prices.
   */
  static async getActiveMarketplaceOffers(productId: string) {
    const admin = createAdminClient();
    const { data: listings } = await admin
      .from("listings")
      .select(`
        id, title, price_per_unit, unit, minimum_order_quantity,
        state, lga, is_verified, created_at,
        inventory (quantity_available),
        farms (name)
      `)
      .eq("product_id", productId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(6);

    if (!listings) return [];

    return listings.map((l) => {
      const inv = Array.isArray(l.inventory) ? l.inventory[0] : l.inventory;
      const farm = Array.isArray(l.farms) ? l.farms[0] : l.farms;
      return {
        id: l.id,
        title: l.title,
        pricePerUnit: Number(l.price_per_unit),
        unit: l.unit,
        minimumOrderQuantity: Number(l.minimum_order_quantity),
        state: l.state,
        lga: l.lga,
        isVerified: Boolean(l.is_verified),
        farmName: farm?.name || null,
        quantityAvailable: Number(inv?.quantity_available || 0),
      };
    });
  }

  /**
   * Computes statistical aggregation for a product in a state or nationwide.
   */
  static async getPriceAggregation(
    productId: string,
    state?: string
  ): Promise<PriceAggregation> {
    const history = await this.getPriceHistory(productId, state, 30);
    const validPrices = history
      .map((h) => (h.normalizedPrice !== null ? h.normalizedPrice : h.price))
      .filter((p) => p > 0);

    if (validPrices.length === 0) {
      return {
        productId,
        averagePrice: null,
        medianPrice: null,
        minPrice: null,
        maxPrice: null,
        observationCount: 0,
        lastObservedAt: null,
        dataSufficiency: "LOW_DATA",
        unit: "KG",
        currency: "NGN",
      };
    }

    validPrices.sort((a, b) => a - b);
    const count = validPrices.length;
    const min = validPrices[0];
    const max = validPrices[count - 1];
    const avg = Number((validPrices.reduce((sum, p) => sum + p, 0) / count).toFixed(2));

    const mid = Math.floor(count / 2);
    const median =
      count % 2 !== 0
        ? validPrices[mid]
        : Number(((validPrices[mid - 1] + validPrices[mid]) / 2).toFixed(2));

    let dataSufficiency: PriceAggregation["dataSufficiency"] = "LOW_DATA";
    if (count >= 10) dataSufficiency = "HIGHER_CONFIDENCE";
    else if (count >= 3) dataSufficiency = "MODERATE";

    return {
      productId,
      averagePrice: avg,
      medianPrice: median,
      minPrice: min,
      maxPrice: max,
      observationCount: count,
      lastObservedAt: history[history.length - 1]?.observedAt || null,
      dataSufficiency,
      unit: "KG",
      currency: "NGN",
    };
  }

  /**
   * Admin-only: verify or reject an observation.
   * Strictly enforces the invariant that SIMULATED records can NEVER be promoted to VERIFIED.
   * Only permits updating verification status and confidence score; historical observation facts
   * are immutable.
   */
  static async setVerificationStatus(
    observationId: string,
    adminId: string,
    status: "VERIFIED" | "REJECTED"
  ): Promise<void> {
    const admin = createAdminClient();

    // 1. Fetch current observation to verify existence and data_quality_label
    const { data: observation, error: fetchErr } = await admin
      .from("price_observations")
      .select("id, data_quality_label, verification_status")
      .eq("id", observationId)
      .single();

    if (fetchErr || !observation) {
      throw new Error("Price observation not found.");
    }

    // 2. Enforce invariant: SIMULATED records cannot be upgraded to VERIFIED
    if (observation.data_quality_label === "SIMULATED" && status === "VERIFIED") {
      throw new Error(
        "SIMULATED price observations cannot be promoted to VERIFIED. Real observations must be inserted as new records."
      );
    }

    // 3. Update only the minimum necessary moderation fields
    const { error } = await admin
      .from("price_observations")
      .update({
        verification_status: status,
        confidence_score: status === "VERIFIED" ? 0.95 : 0.0,
      })
      .eq("id", observationId);

    if (error) {
      throw new Error(`Failed to update observation status: ${error.message}`);
    }

    await recordAuditLog({
      actorId: adminId,
      action: "PRICE_OBSERVATION_MODERATED",
      resourceType: "PRICE_OBSERVATION",
      resourceId: observationId,
      newValues: { status },
    });
  }
}
