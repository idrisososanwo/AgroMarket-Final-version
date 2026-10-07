import { describe, it, expect } from "vitest";
import {
  resolveRecommendationAction,
  buildSafeDeepLink,
} from "@/features/action-integration/intent-mapper";
import {
  assertNoProhibitedProduce,
  containsProhibitedProduce,
  containsPrivateInformation,
  assertSafeDeepLinkParameters,
  isValidActionRoute,
  actionContextPayloadSchema,
  createActionIntegrationSchema,
} from "@/features/action-integration/validation";
import { revalidateActionDestination } from "@/features/action-integration/revalidation";
import { calculateIntelligenceEffectivenessMetrics } from "@/features/action-integration/data-layer";
import { ActionContextPayload } from "@/features/action-integration/types";

describe("Phase 3.3: Agricultural Intelligence Action Integration", () => {
  const sampleContext: ActionContextPayload = {
    recommendationId: "123e4567-e89b-12d3-a456-426614174000",
    decisionId: "223e4567-e89b-12d3-a456-426614174001",
    commodity: "cassava",
    state: "Ogun",
    lga: "Abeokuta South",
    urgency: "HIGH",
  };

  // 1. Recommendation -> Action Mapping
  it("deterministically maps REVIEW_SUPPLY_GAP to appropriate actions for FARMER vs BUYER", () => {
    // Farmer should be guided to create a listing
    const farmerResolved = resolveRecommendationAction({
      recommendationType: "REVIEW_SUPPLY_GAP",
      actorRole: "FARMER",
      context: sampleContext,
    });
    expect(farmerResolved.intent).toBe("CREATE_LISTING");
    expect(farmerResolved.destinationType).toBe("MARKETPLACE");
    expect(farmerResolved.url).toContain("/farmer/listings/new");
    expect(farmerResolved.buttonLabel).toBe("Create Farm Listing");
    expect(farmerResolved.requiresRevalidation).toBe(false);

    // Buyer should be guided to view available supply in the marketplace
    const buyerResolved = resolveRecommendationAction({
      recommendationType: "REVIEW_SUPPLY_GAP",
      actorRole: "BUYER",
      context: sampleContext,
    });
    expect(buyerResolved.intent).toBe("VIEW_SUPPLY_OPTIONS");
    expect(buyerResolved.destinationType).toBe("MARKETPLACE");
    expect(buyerResolved.url).toContain("/marketplace");
    expect(buyerResolved.buttonLabel).toBe("View Available Supply");
    expect(buyerResolved.requiresRevalidation).toBe(true);
  });

  it("deterministically maps DIVERSIFY_SUPPLIERS to procurement intelligence", () => {
    const resolved = resolveRecommendationAction({
      recommendationType: "DIVERSIFY_SUPPLIERS",
      actorRole: "BUYER",
      context: sampleContext,
    });
    expect(resolved.intent).toBe("VIEW_ALTERNATIVE_SUPPLIERS");
    expect(resolved.destinationType).toBe("PROCUREMENT_INTELLIGENCE");
    expect(resolved.url).toContain("/procurement-intelligence");
    expect(resolved.buttonLabel).toBe("Review Alternative Suppliers");
  });

  it("deterministically maps REVIEW_LOGISTICS_OPTIONS to logistics intelligence", () => {
    const resolved = resolveRecommendationAction({
      recommendationType: "REVIEW_LOGISTICS_OPTIONS",
      actorRole: "BUSINESS",
      context: sampleContext,
    });
    expect(resolved.intent).toBe("VIEW_LOGISTICS_OPTIONS");
    expect(resolved.destinationType).toBe("LOGISTICS");
    expect(resolved.url).toContain("/logistics-intelligence");
  });

  it("deterministically maps REVIEW_BIOSECURITY_INFORMATION to disease intelligence", () => {
    const resolved = resolveRecommendationAction({
      recommendationType: "REVIEW_BIOSECURITY_INFORMATION",
      actorRole: "FARMER",
      context: sampleContext,
    });
    expect(resolved.intent).toBe("VIEW_DISEASE_INTELLIGENCE");
    expect(resolved.destinationType).toBe("DISEASE_BIOSECURITY");
    expect(resolved.url).toContain("/disease-intelligence");
  });

  it("deterministically maps REVIEW_EQUIPMENT_OPTIONS to equipment rentals", () => {
    const resolved = resolveRecommendationAction({
      recommendationType: "REVIEW_EQUIPMENT_OPTIONS",
      actorRole: "FARMER",
      context: sampleContext,
    });
    expect(resolved.intent).toBe("REQUEST_EQUIPMENT");
    expect(resolved.destinationType).toBe("EQUIPMENT");
    expect(resolved.url).toContain("/equipment");
    expect(resolved.requiresRevalidation).toBe(true);
  });

  it("deterministically maps REVIEW_AGGREGATION_OPPORTUNITY to shared purchases", () => {
    const resolved = resolveRecommendationAction({
      recommendationType: "REVIEW_AGGREGATION_OPPORTUNITY",
      actorRole: "BUYER",
      context: sampleContext,
    });
    expect(resolved.intent).toBe("VIEW_AGGREGATION_OPTIONS");
    expect(resolved.destinationType).toBe("SHARED_PURCHASE");
    expect(resolved.url).toContain("/shared-purchases");
    expect(resolved.requiresRevalidation).toBe(true);
  });

  // 2. Route Validation & Whitelisting
  it("validates authentic AgroMarket routes and rejects invalid or invented paths", () => {
    expect(isValidActionRoute("/marketplace")).toBe(true);
    expect(isValidActionRoute("/marketplace?commodity=maize")).toBe(true);
    expect(isValidActionRoute("/shared-purchases")).toBe(true);
    expect(isValidActionRoute("/equipment")).toBe(true);
    expect(isValidActionRoute("/services")).toBe(true);
    expect(isValidActionRoute("/procurement-intelligence")).toBe(true);
    expect(isValidActionRoute("/my-intelligence")).toBe(true);
    expect(isValidActionRoute("/learn/expert-advice")).toBe(true);

    // Invalid or malicious paths
    expect(isValidActionRoute("/invalid-fake-route")).toBe(false);
    expect(isValidActionRoute("https://external-phishing.com/")).toBe(false);
    expect(isValidActionRoute("/admin/secret-backdoor")).toBe(false);
  });

  // 3. Deep-Link Construction & Context Preservation
  it("preserves context parameters in deep links safely", () => {
    const url = buildSafeDeepLink("/marketplace", {
      commodity: "maize",
      state: "Kaduna",
      intel_ref: "rec-999",
      dec_ref: "dec-111",
    });

    expect(url).toBe("/marketplace?commodity=maize&state=Kaduna&intel_ref=rec-999&dec_ref=dec-111");
  });

  // 4. Privacy Guardrails (No Phone Numbers or Coordinates in URLs)
  it("detects and rejects sensitive personal information in deep-link parameters", () => {
    expect(containsPrivateInformation("08012345678")).toBe(true);
    expect(containsPrivateInformation("+2348039876543")).toBe(true);
    expect(containsPrivateInformation("Latitude 6.524379")).toBe(true);
    expect(containsPrivateInformation("Safe Commodity Name: Cassava")).toBe(false);

    expect(() =>
      assertSafeDeepLinkParameters({
        commodity: "maize",
        contact_phone: "08031234567",
      })
    ).toThrow(/PRIVACY_VIOLATION/);
  });

  // 5. Zero-Tolerance Anti-Pork Invariant
  it("strictly enforces anti-pork prohibition across commodities, payloads, and queries", () => {
    expect(containsProhibitedProduce("pork chops")).toBe(true);
    expect(containsProhibitedProduce("swine fever")).toBe(true);
    expect(containsProhibitedProduce("wild boar")).toBe(true);
    expect(containsProhibitedProduce("cassava tubers")).toBe(false);

    expect(() => assertNoProhibitedProduce("pig farming")).toThrow(/ANTI_PORK_VIOLATION/);
    expect(() =>
      assertNoProhibitedProduce({
        commodity: "pork belly",
      })
    ).toThrow(/ANTI_PORK_VIOLATION/);

    expect(() =>
      buildSafeDeepLink("/marketplace", {
        commodity: "pork",
      })
    ).toThrow(/ANTI_PORK_VIOLATION/);
  });

  // 6. Schema Validation
  it("validates ActionContextPayload schema correctly", () => {
    const valid = actionContextPayloadSchema.safeParse(sampleContext);
    expect(valid.success).toBe(true);

    const invalidState = actionContextPayloadSchema.safeParse({
      ...sampleContext,
      state: "Atlantis", // Not a Nigerian state
    });
    expect(invalidState.success).toBe(false);

    const porkAttempt = actionContextPayloadSchema.safeParse({
      ...sampleContext,
      commodity: "pork sausages",
    });
    expect(porkAttempt.success).toBe(false);
  });

  it("validates CreateActionIntegrationSchema and rejects unwhitelisted routes", () => {
    const valid = createActionIntegrationSchema.safeParse({
      recommendationId: "123e4567-e89b-12d3-a456-426614174000",
      actionIntent: "VIEW_SUPPLY_OPTIONS",
      destinationType: "MARKETPLACE",
      destinationUrl: "/marketplace?commodity=cassava",
      contextPayload: sampleContext,
    });
    expect(valid.success).toBe(true);

    const fakeRoute = createActionIntegrationSchema.safeParse({
      recommendationId: "123e4567-e89b-12d3-a456-426614174000",
      actionIntent: "VIEW_SUPPLY_OPTIONS",
      destinationType: "MARKETPLACE",
      destinationUrl: "/invented-fake-portal",
      contextPayload: sampleContext,
    });
    expect(fakeRoute.success).toBe(false);
  });

  // 7. Destination Revalidation Service
  it("executes destination revalidation cleanly for marketplace, shared purchase, and equipment", async () => {
    const marketCheck = await revalidateActionDestination({
      destinationType: "MARKETPLACE",
      commodity: "maize",
      state: "Kano",
    });
    expect(marketCheck.destinationType).toBe("MARKETPLACE");
    expect(marketCheck.checkedAt).toBeDefined();

    const spCheck = await revalidateActionDestination({
      destinationType: "SHARED_PURCHASE",
      commodity: "rice",
    });
    expect(spCheck.destinationType).toBe("SHARED_PURCHASE");

    const eqCheck = await revalidateActionDestination({
      destinationType: "EQUIPMENT",
      state: "Oyo",
    });
    expect(eqCheck.destinationType).toBe("EQUIPMENT");

    const advCheck = await revalidateActionDestination({
      destinationType: "FOOD_SECURITY",
    });
    expect(advCheck.status).toBe("VALID");
    expect(advCheck.isAvailable).toBe(true);
  });

  // 8. Conversion & Effectiveness Metrics (Non-Causal Association)
  it("calculates deterministic conversion metrics without manufacturing causal certainty", async () => {
    const metrics = await calculateIntelligenceEffectivenessMetrics();
    expect(metrics.totalRecommendationsGenerated).toBeGreaterThanOrEqual(0);
    expect(metrics.recommendationViewRate).toBeGreaterThanOrEqual(0);
    expect(metrics.decisionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.actionInitiationRate).toBeGreaterThanOrEqual(0);
    expect(metrics.governanceNote).toContain("associations");
    expect(metrics.governanceNote).toContain("control groups");
  });
});
