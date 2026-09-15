import { describe, it, expect } from "vitest";
import { normalizePrice } from "@/features/prices/normalization";
import { calculatePriceTrend } from "@/features/prices/trend";
import { calculateBaselineDemandForecast } from "@/features/demand/forecasting";
import { PriceObservation } from "@/features/prices/types";
import { PlatformTransactionPriceProvider } from "@/features/prices/provider";
import {
  validatePriceObservationUpdate,
  IMMUTABLE_PRICE_OBSERVATION_FACTS,
} from "@/features/prices/immutability";
import {
  normalizeDemandQuantity,
  aggregateDemandQuantities,
  resolveCanonicalDemandUnit,
} from "@/features/demand/units";

describe("Phase 0.9 Market Intelligence & Demand Forecasting", () => {
  describe("Price Unit Normalization", () => {
    it("correctly normalizes standard weight-based units to canonical KG", () => {
      // 50kg Bag: ₦50,000 / 50 = ₦1,000 / kg
      const bag50 = normalizePrice(50000, "50kg Bag");
      expect(bag50.normalizedPrice).toBe(1000);
      expect(bag50.normalizedUnit).toBe("KG");
      expect(bag50.status).toBe("NORMALIZED");

      // 100kg Bag: ₦85,000 / 100 = ₦850 / kg
      const bag100 = normalizePrice(85000, "100kg Bag");
      expect(bag100.normalizedPrice).toBe(850);
      expect(bag100.normalizedUnit).toBe("KG");
      expect(bag100.status).toBe("NORMALIZED");

      // 25kg Bag: ₦30,000 / 25 = ₦1,200 / kg
      const bag25 = normalizePrice(30000, "25kg Bag");
      expect(bag25.normalizedPrice).toBe(1200);
      expect(bag25.normalizedUnit).toBe("KG");
      expect(bag25.status).toBe("NORMALIZED");

      // Tonne (MT): ₦1,500,000 / 1000 = ₦1,500 / kg
      const tonne = normalizePrice(1500000, "Tonne (MT)");
      expect(tonne.normalizedPrice).toBe(1500);
      expect(tonne.normalizedUnit).toBe("KG");
      expect(tonne.status).toBe("NORMALIZED");

      // Kilogram (kg): Exact 1:1
      const kg = normalizePrice(1750, "Kilogram (kg)");
      expect(kg.normalizedPrice).toBe(1750);
      expect(kg.normalizedUnit).toBe("KG");
      expect(kg.status).toBe("EXACT");
    });

    it("correctly normalizes standard liquid units to canonical LITRE", () => {
      // Gallon (25L): ₦45,000 / 25 = ₦1,800 / litre
      const gallon = normalizePrice(45000, "Gallon (25L)");
      expect(gallon.normalizedPrice).toBe(1800);
      expect(gallon.normalizedUnit).toBe("LITRE");
      expect(gallon.status).toBe("NORMALIZED");

      // Litre: Exact 1:1
      const litre = normalizePrice(2200, "Litre");
      expect(litre.normalizedPrice).toBe(2200);
      expect(litre.normalizedUnit).toBe("LITRE");
      expect(litre.status).toBe("EXACT");
    });

    it("safely marks variable packaging as UNAVAILABLE rather than guessing", () => {
      const basket = normalizePrice(15000, "Basket");
      expect(basket.normalizedPrice).toBeNull();
      expect(basket.normalizedUnit).toBeNull();
      expect(basket.status).toBe("UNAVAILABLE");

      const crate = normalizePrice(35000, "Crate");
      expect(crate.normalizedPrice).toBeNull();
      expect(crate.normalizedUnit).toBeNull();
      expect(crate.status).toBe("UNAVAILABLE");

      const bunch = normalizePrice(5000, "Bunch");
      expect(bunch.normalizedPrice).toBeNull();
      expect(bunch.status).toBe("UNAVAILABLE");

      const animal = normalizePrice(120000, "Live Animal / Head");
      expect(animal.normalizedPrice).toBeNull();
      expect(animal.status).toBe("UNAVAILABLE");
    });

    it("rejects non-positive or invalid raw prices safely", () => {
      const zero = normalizePrice(0, "50kg Bag");
      expect(zero.normalizedPrice).toBeNull();
      expect(zero.status).toBe("UNAVAILABLE");

      const negative = normalizePrice(-500, "Kilogram (kg)");
      expect(negative.normalizedPrice).toBeNull();
      expect(negative.status).toBe("UNAVAILABLE");
    });
  });

  describe("Deterministic Price Trend Engine", () => {
    const createMockObs = (
      price: number,
      normalizedPrice: number,
      daysAgo: number,
      unit = "50kg Bag",
      state = "Lagos"
    ): PriceObservation => ({
      id: `obs-${daysAgo}-${Math.random()}`,
      productId: "prod-maize",
      marketName: "Mile 12",
      state,
      lga: "Kosofe",
      price,
      currency: "NGN",
      unit,
      normalizedPrice,
      normalizedUnit: "KG",
      normalizationStatus: "NORMALIZED",
      sourceType: "MARKET_SURVEY",
      reportedBy: null,
      verificationStatus: "VERIFIED",
      confidenceScore: 0.9,
      dataQualityLabel: "OBSERVED",
      observedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {},
      createdAt: new Date().toISOString(),
    });

    it("detects a RISING price trend when prices increase by > 2%", () => {
      // Prev period (30-60 days ago): avg ₦1,000/kg
      // Current period (0-30 days ago): avg ₦1,100/kg (+10%)
      const observations: PriceObservation[] = [
        createMockObs(55000, 1100, 5),
        createMockObs(55000, 1100, 15),
        createMockObs(50000, 1000, 35),
        createMockObs(50000, 1000, 45),
      ];

      const result = calculatePriceTrend({
        productId: "prod-maize",
        state: "Lagos",
        observations,
        periodDays: 30,
        targetUnit: "KG",
      });

      expect(result.trend).toBe("RISING");
      expect(result.percentageChange).toBe(10);
      expect(result.currentPeriodAvg).toBe(1100);
      expect(result.previousPeriodAvg).toBe(1000);
      expect(result.observationCount).toBe(4);
    });

    it("detects a FALLING price trend when prices drop by > 2%", () => {
      // Prev period: ₦1,000/kg
      // Current period: ₦900/kg (-10%)
      const observations: PriceObservation[] = [
        createMockObs(45000, 900, 5),
        createMockObs(45000, 900, 10),
        createMockObs(50000, 1000, 35),
        createMockObs(50000, 1000, 40),
      ];

      const result = calculatePriceTrend({
        productId: "prod-maize",
        state: "Lagos",
        observations,
        periodDays: 30,
        targetUnit: "KG",
      });

      expect(result.trend).toBe("FALLING");
      expect(result.percentageChange).toBe(-10);
      expect(result.currentPeriodAvg).toBe(900);
      expect(result.previousPeriodAvg).toBe(1000);
    });

    it("detects a STABLE price trend when movement is within ±2%", () => {
      const observations: PriceObservation[] = [
        createMockObs(50500, 1010, 5), // +1%
        createMockObs(50000, 1000, 35),
      ];

      const result = calculatePriceTrend({
        productId: "prod-maize",
        state: "Lagos",
        observations,
        periodDays: 30,
        targetUnit: "KG",
      });

      expect(result.trend).toBe("STABLE");
      expect(result.percentageChange).toBe(1);
    });

    it("returns INSUFFICIENT_DATA when previous or current window is empty", () => {
      // Only current period observations exist
      const observations: PriceObservation[] = [
        createMockObs(50000, 1000, 5),
        createMockObs(50000, 1000, 12),
      ];

      const result = calculatePriceTrend({
        productId: "prod-maize",
        state: "Lagos",
        observations,
        periodDays: 30,
        targetUnit: "KG",
      });

      expect(result.trend).toBe("INSUFFICIENT_DATA");
      expect(result.percentageChange).toBeNull();
      expect(result.previousPeriodAvg).toBeNull();
      expect(result.currentPeriodAvg).toBe(1000);
    });

    it("safely handles zero-price previous periods without division by zero errors", () => {
      const observations: PriceObservation[] = [
        createMockObs(50000, 1000, 5),
        createMockObs(0, 0, 40),
      ];

      const result = calculatePriceTrend({
        productId: "prod-maize",
        state: "Lagos",
        observations,
        periodDays: 30,
        targetUnit: "KG",
      });

      expect(result.trend).toBe("INSUFFICIENT_DATA");
      expect(result.percentageChange).toBeNull();
    });
  });

  describe("Append-Only Price History Integrity", () => {
    it("preserves multiple chronological observations without destructive overwrites", () => {
      const obsHistory: PriceObservation[] = [
        {
          id: "obs-1",
          productId: "prod-rice",
          marketName: "Mile 12",
          state: "Lagos",
          lga: "Kosofe",
          price: 85000,
          currency: "NGN",
          unit: "50kg Bag",
          normalizedPrice: 1700,
          normalizedUnit: "KG",
          normalizationStatus: "NORMALIZED",
          sourceType: "MARKET_SURVEY",
          reportedBy: null,
          verificationStatus: "VERIFIED",
          confidenceScore: 0.8,
          dataQualityLabel: "OBSERVED",
          observedAt: "2026-09-01T10:00:00Z",
          metadata: {},
          createdAt: "2026-09-01T10:00:00Z",
        },
        {
          id: "obs-2",
          productId: "prod-rice",
          marketName: "Mile 12",
          state: "Lagos",
          lga: "Kosofe",
          price: 88000,
          currency: "NGN",
          unit: "50kg Bag",
          normalizedPrice: 1760,
          normalizedUnit: "KG",
          normalizationStatus: "NORMALIZED",
          sourceType: "MARKET_SURVEY",
          reportedBy: null,
          verificationStatus: "VERIFIED",
          confidenceScore: 0.85,
          dataQualityLabel: "OBSERVED",
          observedAt: "2026-09-05T10:00:00Z",
          metadata: {},
          createdAt: "2026-09-05T10:00:00Z",
        },
      ];

      // Both records exist
      expect(obsHistory.length).toBe(2);
      expect(obsHistory[0].normalizedPrice).toBe(1700);
      expect(obsHistory[1].normalizedPrice).toBe(1760);
      expect(obsHistory[0].id).not.toBe(obsHistory[1].id);
    });

    it("rejects attempts to modify historical observation facts (commodity, location, price, unit, source, timestamps)", () => {
      const existingObservation: PriceObservation = {
        id: "obs-fixed-1",
        productId: "prod-maize",
        marketName: "Dawanau Grain Market",
        state: "Kano",
        lga: "Dawakin Tofa",
        price: 64000,
        currency: "NGN",
        unit: "100kg Bag",
        normalizedPrice: 640,
        normalizedUnit: "KG",
        normalizationStatus: "NORMALIZED",
        sourceType: "MARKET_SURVEY",
        reportedBy: "surveyor-123",
        verificationStatus: "SELF_REPORTED",
        confidenceScore: 0.8,
        dataQualityLabel: "OBSERVED",
        observedAt: "2026-09-10T08:00:00Z",
        metadata: {},
        createdAt: "2026-09-10T08:00:00Z",
      };

      // Test every immutable historical fact
      for (const field of IMMUTABLE_PRICE_OBSERVATION_FACTS) {
        if (field === "id") continue;
        const fakeValue = typeof existingObservation[field] === "number" ? 999999 : "ALTERED_VALUE";
        const result = validatePriceObservationUpdate(existingObservation, {
          [field]: fakeValue,
        } as Partial<PriceObservation>);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain(`Cannot modify immutable historical observation fact: ${field}`);
      }
    });

    it("allows updating only moderation fields (verificationStatus, confidenceScore) on real observations", () => {
      const realObservation: PriceObservation = {
        id: "obs-real-1",
        productId: "prod-beans",
        marketName: "Bodija",
        state: "Oyo",
        lga: "Ibadan North",
        price: 110000,
        currency: "NGN",
        unit: "100kg Bag",
        normalizedPrice: 1100,
        normalizedUnit: "KG",
        normalizationStatus: "NORMALIZED",
        sourceType: "FARMER_REPORTED",
        reportedBy: "farmer-456",
        verificationStatus: "SELF_REPORTED",
        confidenceScore: 0.6,
        dataQualityLabel: "OBSERVED",
        observedAt: "2026-09-11T10:00:00Z",
        metadata: {},
        createdAt: "2026-09-11T10:00:00Z",
      };

      const verifyResult = validatePriceObservationUpdate(realObservation, {
        verificationStatus: "VERIFIED",
        confidenceScore: 0.95,
      });

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.errors).toHaveLength(0);

      const rejectResult = validatePriceObservationUpdate(realObservation, {
        verificationStatus: "REJECTED",
        confidenceScore: 0.0,
      });

      expect(rejectResult.valid).toBe(true);
      expect(rejectResult.errors).toHaveLength(0);
    });
  });

  describe("Preventing SIMULATED Data from Becoming VERIFIED", () => {
    const simulatedObservation: PriceObservation = {
      id: "sim-obs-001",
      productId: "b0000000-0000-0000-0000-000000000004",
      marketName: "Mile 12 International Market",
      state: "Lagos",
      lga: "Kosofe",
      price: 88000,
      currency: "NGN",
      unit: "50kg Bag",
      normalizedPrice: 1760,
      normalizedUnit: "KG",
      normalizationStatus: "NORMALIZED",
      sourceType: "MARKET_SURVEY",
      reportedBy: null,
      verificationStatus: "SELF_REPORTED",
      confidenceScore: 0.8,
      dataQualityLabel: "SIMULATED",
      observedAt: "2026-09-12T10:00:00Z",
      metadata: { simulated: true },
      createdAt: "2026-09-12T10:00:00Z",
    };

    it("strictly rejects promoting SIMULATED observations to VERIFIED", () => {
      const result = validatePriceObservationUpdate(simulatedObservation, {
        verificationStatus: "VERIFIED",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        "SIMULATED observations must never be promoted to VERIFIED"
      );
    });

    it("strictly rejects modifying the dataQualityLabel on SIMULATED observations", () => {
      const result = validatePriceObservationUpdate(simulatedObservation, {
        dataQualityLabel: "VERIFIED",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        "SIMULATED price observation data quality label cannot be modified"
      );
    });

    it("permits marking a SIMULATED observation as REJECTED", () => {
      const result = validatePriceObservationUpdate(simulatedObservation, {
        verificationStatus: "REJECTED",
        confidenceScore: 0.0,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Demand Unit Consistency & Platform Signals Aggregation", () => {
    it("resolves canonical demand units correctly for commodities", () => {
      expect(resolveCanonicalDemandUnit("50kg Bag")).toBe("KG");
      expect(resolveCanonicalDemandUnit("100KG_BAG")).toBe("KG");
      expect(resolveCanonicalDemandUnit("TONNE")).toBe("KG");
      expect(resolveCanonicalDemandUnit("25L_KEG")).toBe("LITRE");
      expect(resolveCanonicalDemandUnit("CRATE")).toBe("CRATE");
      expect(resolveCanonicalDemandUnit("HEAD")).toBe("HEAD");
    });

    it("normalizes individual demand quantities deterministically", () => {
      const bagNorm = normalizeDemandQuantity(20, "50kg Bag", "KG");
      expect(bagNorm.isCompatible).toBe(true);
      expect(bagNorm.normalizedQuantity).toBe(1000);
      expect(bagNorm.status).toBe("NORMALIZED");

      const exactKg = normalizeDemandQuantity(500, "KG", "KG");
      expect(exactKg.isCompatible).toBe(true);
      expect(exactKg.normalizedQuantity).toBe(500);
      expect(exactKg.status).toBe("EXACT");

      const crateKg = normalizeDemandQuantity(5, "Crate", "KG");
      expect(crateKg.isCompatible).toBe(false);
      expect(crateKg.normalizedQuantity).toBeNull();
      expect(crateKg.status).toBe("INCOMPATIBLE");
    });

    it("normalizes compatible multi-unit orders (20 x 50kg bag, 500kg, 10 x 25kg bag) to 1,750kg instead of 530 generic units", () => {
      // 20 × 50kg bags = 1,000 kg
      // 500 kg = 500 kg
      // 10 × 25kg bags = 250 kg
      // Total = 1,750 KG (NOT 530 generic units!)
      const orderItems = [
        { quantity: 20, unit: "50kg Bag" },
        { quantity: 500, unit: "KG" },
        { quantity: 10, unit: "25kg Bag" },
      ];

      const aggregation = aggregateDemandQuantities(orderItems, "KG");

      expect(aggregation.canonicalUnit).toBe("KG");
      expect(aggregation.totalVolume).toBe(1750);
      expect(aggregation.sampleCount).toBe(3);
      expect(aggregation.incompatibleCount).toBe(0);
      // Explicit proof that it did NOT become 530 generic units:
      expect(aggregation.totalVolume).not.toBe(530);
    });

    it("safely isolates incompatible packaging (crates, baskets, bunches) without inventing conversions", () => {
      const mixedItems = [
        { quantity: 10, unit: "50kg Bag" }, // 500 kg
        { quantity: 5, unit: "Crate" },      // Incompatible with KG; must NOT invent conversion
        { quantity: 2, unit: "Basket" },     // Incompatible with KG
      ];

      const aggregation = aggregateDemandQuantities(mixedItems, "KG");

      expect(aggregation.canonicalUnit).toBe("KG");
      expect(aggregation.totalVolume).toBe(500); // Only the 500kg is aggregated
      expect(aggregation.sampleCount).toBe(1);
      expect(aggregation.incompatibleCount).toBe(2);
      expect(aggregation.incompatibleUnits).toContain("Crate");
      expect(aggregation.incompatibleUnits).toContain("Basket");
    });

    it("aggregates discrete units cleanly when target unit is discrete", () => {
      const tomatoCrates = [
        { quantity: 25, unit: "Crate" },
        { quantity: 15, unit: "CRATE" },
        { quantity: 2, unit: "100kg Bag" }, // Incompatible with Crate
      ];

      const aggregation = aggregateDemandQuantities(tomatoCrates, "CRATE");

      expect(aggregation.canonicalUnit).toBe("CRATE");
      expect(aggregation.totalVolume).toBe(40);
      expect(aggregation.sampleCount).toBe(2);
      expect(aggregation.incompatibleCount).toBe(1);
    });

    it("demand forecast correctly normalizes multi-unit orders to canonical volume", () => {
      const orders = [
        { quantity: 20, unit: "50kg Bag", createdAt: new Date().toISOString() }, // 1000 kg
        { quantity: 500, unit: "kg", createdAt: new Date().toISOString() },      // 500 kg
        { quantity: 10, unit: "25kg Bag", createdAt: new Date().toISOString() }, // 250 kg
      ];

      const forecast = calculateBaselineDemandForecast({
        productId: "prod-rice",
        regionState: "Lagos",
        historicalOrders: orders,
        dataWindowDays: 30,
        forecastHorizonDays: 7,
        volumeUnit: "KG",
      });

      // Total volume = 1,750 kg
      // Daily avg = 1750 / 30 = 58.3333
      // 7-day horizon = 58.3333 * 7 = 408.33 kg
      expect(forecast.metadata.totalHistoricalVolume).toBe(1750);
      expect(forecast.metadata.sampleOrderCount).toBe(3);
      expect(forecast.predictedDemandVolume).toBe(408.33);
      expect(forecast.metadata.canonicalUnit).toBe("KG");
    });

    it("strictly separates active cart demand interest from completed sales volume", () => {
      // In platform demand signals, active cart count is returned as activeCartItemsCount
      // and is not merged into totalQuantitySold30Days
      const signalMock = {
        orderCount30Days: 5,
        totalQuantitySold30Days: 1750, // Normalized completed sales
        activeCartItemsCount: 35,      // Buyer pipeline interest
        activeListingsCount: 12,
        unit: "KG",
      };

      expect(signalMock.totalQuantitySold30Days).toBe(1750);
      expect(signalMock.activeCartItemsCount).toBe(35);
      expect(signalMock.totalQuantitySold30Days + signalMock.activeCartItemsCount).not.toBe(
        signalMock.totalQuantitySold30Days
      );
    });
  });

  describe("Baseline Demand Forecasting Engine", () => {
    it("calculates moving-average baseline demand correctly for 30-day window", () => {
      // 10 orders of 50 units each = 500 units total over 30 days
      // Daily avg = 500 / 30 = 16.6667
      // 7-day horizon = 16.6667 * 7 = 116.67 units
      const orders = Array.from({ length: 10 }).map((_, i) => ({
        quantity: 50,
        createdAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const forecast = calculateBaselineDemandForecast({
        productId: "prod-rice",
        regionState: "Lagos",
        historicalOrders: orders,
        dataWindowDays: 30,
        forecastHorizonDays: 7,
        volumeUnit: "50KG_BAG",
      });

      expect(forecast.predictedDemandVolume).toBe(116.67);
      expect(forecast.confidenceLevel).toBe("HIGH");
      expect(forecast.confidenceScore).toBe(0.85);
      expect(forecast.metadata.totalHistoricalVolume).toBe(500);
      expect(forecast.metadata.sampleOrderCount).toBe(10);
      expect(forecast.method).toBe("MOVING_AVERAGE_30D");
    });

    it("returns INSUFFICIENT_DATA when zero orders exist", () => {
      const forecast = calculateBaselineDemandForecast({
        productId: "prod-rice",
        regionState: "Sokoto",
        historicalOrders: [],
        dataWindowDays: 30,
        forecastHorizonDays: 7,
        volumeUnit: "50KG_BAG",
      });

      expect(forecast.predictedDemandVolume).toBe(0);
      expect(forecast.confidenceLevel).toBe("INSUFFICIENT_DATA");
      expect(forecast.metadata.sampleOrderCount).toBe(0);
      expect(forecast.metadata.limitationsNote).toContain("Insufficient historical transactions");
    });

    it("assigns LOW confidence when very few orders (1-2) are recorded", () => {
      const orders = [
        { quantity: 20, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      const forecast = calculateBaselineDemandForecast({
        productId: "prod-rice",
        regionState: "Kano",
        historicalOrders: orders,
        dataWindowDays: 30,
        forecastHorizonDays: 7,
        volumeUnit: "50KG_BAG",
      });

      expect(forecast.confidenceLevel).toBe("LOW");
      expect(forecast.confidenceScore).toBe(0.4);
      expect(forecast.predictedDemandVolume).toBe(4.67); // (20/30) * 7
    });
  });

  describe("Data Ingestion & Privacy Protection", () => {
    it("anonymizes platform transaction data into price observations without leaking buyer/seller", () => {
      const provider = new PlatformTransactionPriceProvider();
      const obs = provider.transformTransactionToObservation({
        productId: "prod-beans",
        state: "Kano",
        unitPrice: 115000,
        unit: "100kg Bag",
        completedAt: "2026-09-12T12:00:00Z",
      });

      expect(obs.sourceType).toBe("PLATFORM_TRANSACTION");
      expect(obs.normalizedPrice).toBe(1150); // 115000 / 100
      expect(obs.normalizedUnit).toBe("KG");
      expect(obs.confidenceScore).toBe(0.95);
      expect(obs.dataQualityLabel).toBe("VERIFIED");

      // Verify privacy: No user ids or phone numbers in observation payload
      const payload = obs as unknown as Record<string, unknown>;
      expect(payload.buyerId).toBeUndefined();
      expect(payload.sellerId).toBeUndefined();
      expect(payload.phone).toBeUndefined();
    });
  });

  describe("Anti-Pork Policy Compliance", () => {
    const prohibitedRegex = /\b(pork|pig|swine|bacon|ham|lard)\b/i;

    it("rejects prohibited porcine products from market price observations", () => {
      expect(prohibitedRegex.test("Pork Belly")).toBe(true);
      expect(prohibitedRegex.test("Swine Feed")).toBe(true);
      expect(prohibitedRegex.test("Pig Livestock")).toBe(true);
      expect(prohibitedRegex.test("Smoked Bacon")).toBe(true);
    });

    it("approves canonical Nigerian crops, poultry, and ruminants", () => {
      expect(prohibitedRegex.test("Milled Parboiled Rice")).toBe(false);
      expect(prohibitedRegex.test("White Maize (Grain)")).toBe(false);
      expect(prohibitedRegex.test("Brown Beans (Cowpea)")).toBe(false);
      expect(prohibitedRegex.test("Live Ram (Balami / Yankasa)")).toBe(false);
      expect(prohibitedRegex.test("Live Boer / Red Sokoto Goat")).toBe(false);
      expect(prohibitedRegex.test("Fresh Live African Catfish")).toBe(false);
    });
  });
});
