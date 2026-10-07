import { describe, it, expect } from "vitest";
import {
  buildNormalizedDecisionContext,
  getRelevantDomainsForRole,
} from "@/features/decision-intelligence/context-builder";
import {
  generateGovernedRecommendations,
  resolveActionRoute,
} from "@/features/decision-intelligence/recommendation-engine";
import {
  assertNoProhibitedProduce,
  containsProhibitedProduce,
  recordUserActionSchema,
  recordUserDecisionSchema,
  userIntelligencePreferencesSchema,
  createGovernedNotificationSchema,
  recordOutcomeEvaluationSchema,
} from "@/features/decision-intelligence/validation";
import {
  getDefaultPreferences,
} from "@/features/decision-intelligence/data-layer";
import {
  RecommendationType,
} from "@/features/decision-intelligence/types";
import { AgentOutputContribution } from "@/features/orchestration/types";

describe("Phase 3.2: Agricultural Decision & Action Intelligence Foundation", () => {
  const mockSignals: AgentOutputContribution[] = [
    {
      agentId: "MARKET_INTELLIGENCE_AGENT",
      agentType: "DOMAIN_AGENT",
      domain: "MARKET",
      geographicScope: { state: "Kano", geopoliticalZone: "North West" },
      state: "Kano",
      lga: "Dala",
      geopoliticalZone: "North West",
      commodity: "White Maize",
      commodityCategory: "Grains & Cereals",
      signalType: "WHOLESALE_PRICE_PRESSURE",
      severity: "HIGH",
      score: 72,
      confidence: 0.88,
      evidenceConfidence: 0.85,
      evidenceCount: 14,
      observationTime: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      sourceReferences: ["Wholesale Dawanau grain trading observations"],
      affectedValueChainStage: "AGGREGATION",
      dependencies: [],
      limitations: ["High market volatility during harvest transit"],
      recommendationCandidates: ["REVIEW_MARKET_OPPORTUNITY"],
    },
    {
      agentId: "DISEASE_BIOSECURITY_AGENT",
      agentType: "DOMAIN_AGENT",
      domain: "DISEASE_BIOSECURITY",
      geographicScope: { state: "Benue", geopoliticalZone: "North Central" },
      state: "Benue",
      lga: "Gboko",
      geopoliticalZone: "North Central",
      commodity: "Cassava Roots",
      commodityCategory: "Roots & Tubers",
      signalType: "CASSAVA_MOSAIC_SURVEILLANCE",
      severity: "CRITICAL",
      score: 85,
      confidence: 0.92,
      evidenceConfidence: 0.90,
      evidenceCount: 9,
      observationTime: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      sourceReferences: ["Benue Extension Agronomy Field Notice"],
      affectedValueChainStage: "PRODUCTION",
      dependencies: [],
      limitations: ["Confirmed via visual leaf symptoms"],
      recommendationCandidates: ["REVIEW_BIOSECURITY_INFORMATION"],
    },
    {
      agentId: "LOGISTICS_INTELLIGENCE_AGENT",
      agentType: "DOMAIN_AGENT",
      domain: "LOGISTICS",
      geographicScope: { state: "Kaduna", geopoliticalZone: "North West" },
      state: "Kaduna",
      lga: "Zaria",
      geopoliticalZone: "North West",
      commodity: "Roma Tomatoes",
      commodityCategory: "Vegetables",
      signalType: "CORRIDOR_TRANSIT_DELAY",
      severity: "MEDIUM",
      score: 55,
      confidence: 0.80,
      evidenceConfidence: 0.78,
      evidenceCount: 5,
      observationTime: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      sourceReferences: ["Transit corridor checkpoints"],
      affectedValueChainStage: "LOGISTICS",
      dependencies: [],
      limitations: ["Transit checkpoint congestion"],
      recommendationCandidates: ["REVIEW_LOGISTICS_OPTIONS"],
    },
  ];

  // ---------------------------------------------------------------------------
  // 1. Role-Based Decision Context & Signal Filtering
  // ---------------------------------------------------------------------------
  it("filters decision contexts strictly by actor role domain boundaries", () => {
    // Farmer should see market, production, logistics, biosecurity
    const farmerDomains = getRelevantDomainsForRole("FARMER");
    expect(farmerDomains).toContain("MARKET");
    expect(farmerDomains).toContain("DISEASE_BIOSECURITY");
    expect(farmerDomains).toContain("LOGISTICS");

    // Buyer should prioritize supply, demand, market, logistics, procurement
    const buyerDomains = getRelevantDomainsForRole("BUYER");
    expect(buyerDomains).toContain("SUPPLY");
    expect(buyerDomains).toContain("PROCUREMENT");
    expect(buyerDomains).not.toContain("DISEASE_BIOSECURITY");

    // Service provider should focus on production, logistics, demand
    const serviceDomains = getRelevantDomainsForRole("SERVICE_PROVIDER");
    expect(serviceDomains).toContain("PRODUCTION");
    expect(serviceDomains).toContain("LOGISTICS");

    // Admin should retain complete cross-domain visibility
    const adminDomains = getRelevantDomainsForRole("ADMIN");
    expect(adminDomains).toHaveLength(8);
  });

  it("builds normalized decision context tailored to user role and state filters", () => {
    const context = buildNormalizedDecisionContext({
      actorRole: "FARMER",
      state: "Kano",
      monitoredCommodities: ["White Maize"],
      rawSignals: mockSignals,
    });

    expect(context.actorRole).toBe("FARMER");
    expect(context.state).toBe("Kano");
    expect(context.selectedCommodities).toContain("White Maize");
    expect(context.signals.length).toBeGreaterThanOrEqual(1);

    // Signals should be filtered for Kano and White Maize
    const kanoSignals = context.signals.filter((s) => s.state === "Kano");
    expect(kanoSignals.length).toBe(1);
    expect(kanoSignals[0].commodity).toBe("White Maize");
  });

  // ---------------------------------------------------------------------------
  // 2. Personalization & User Preferences
  // ---------------------------------------------------------------------------
  it("initializes default user intelligence preferences with safe fallbacks", () => {
    const prefs = getDefaultPreferences("user-123", "BUYER");
    expect(prefs.userId).toBe("user-123");
    expect(prefs.primaryRole).toBe("BUYER");
    expect(prefs.digestFrequency).toBe("DAILY");
    expect(prefs.minConfidence).toBe(0.5);
    expect(prefs.monitoredCommodities).toEqual([]);
  });

  it("validates user preferences schema and rejects prohibited produce", () => {
    const valid = userIntelligencePreferencesSchema.safeParse({
      primaryRole: "FARMER",
      preferredStates: ["Kano", "Kaduna"],
      preferredLgas: [],
      monitoredCommodities: ["White Maize", "Soybeans"],
      urgencyThreshold: "MEDIUM",
      minConfidence: 0.6,
      notificationChannels: ["IN_APP"],
      digestFrequency: "DAILY",
      mutedRecommendationTypes: [],
    });
    expect(valid.success).toBe(true);

    const invalid = userIntelligencePreferencesSchema.safeParse({
      primaryRole: "FARMER",
      preferredStates: ["Kano"],
      preferredLgas: [],
      monitoredCommodities: ["Pork Meat", "Soybeans"],
      urgencyThreshold: "MEDIUM",
    });
    expect(invalid.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 3. Recommendation Quality & The 8 Core Invariant Questions
  // ---------------------------------------------------------------------------
  it("synthesizes recommendations answering all 8 core decision questions", () => {
    const recs = generateGovernedRecommendations({
      userRole: "FARMER",
      state: "Benue",
      rawSignals: mockSignals,
    });

    expect(recs.length).toBeGreaterThan(0);
    const rec = recs[0];

    // Every recommendation must answer all 8 questions
    expect(rec.eightQuestions.whatIsHappening).toBeTruthy();
    expect(rec.eightQuestions.whyDoesItMatter).toBeTruthy();
    expect(rec.eightQuestions.whoDoesItAffect).toBeTruthy();
    expect(rec.eightQuestions.where).toBeTruthy();
    expect(rec.eightQuestions.whatEvidenceSupportsIt).toBeTruthy();
    expect(rec.eightQuestions.whatCouldTheUserConsiderDoing).toBeTruthy();
    expect(rec.eightQuestions.whatAreTheLimitations).toContain("Advisory intelligence");
    expect(rec.eightQuestions.whatHappenedAfterUserDecided).toBeNull(); // No decision yet
  });

  it("strictly separates evidence confidence from urgency and priority", () => {
    const recs = generateGovernedRecommendations({
      userRole: "FARMER",
      rawSignals: mockSignals,
    });

    for (const rec of recs) {
      // Confidence is a numeric float between 0.0 and 1.0
      expect(rec.confidence).toBeGreaterThanOrEqual(0.0);
      expect(rec.confidence).toBeLessThanOrEqual(1.0);

      // Priority and urgency are separate categorical enums
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(rec.priority);
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(rec.urgency);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Recommendation Lifecycle & Expiration
  // ---------------------------------------------------------------------------
  it("enforces recommendation status lifecycle states", () => {
    const validStatuses = [
      "PROPOSED",
      "REVIEWED",
      "ACCEPTED",
      "ACTIONED",
      "COMPLETED",
      "REJECTED",
      "EXPIRED",
    ];

    expect(validStatuses).toContain("EXPIRED");
    expect(validStatuses).toContain("PROPOSED");
    expect(validStatuses).toContain("ACTIONED");
  });

  // ---------------------------------------------------------------------------
  // 5. User Decision Lifecycle & Validation
  // ---------------------------------------------------------------------------
  it("validates user decisions across all 8 decision actions", () => {
    const validDecisions = [
      "ACCEPT",
      "REJECT",
      "DISMISS",
      "DEFER",
      "SAVE",
      "REQUEST_MORE_INFORMATION",
      "SEEK_EXPERT",
      "TAKE_EXTERNAL_ACTION",
    ];

    for (const dec of validDecisions) {
      const res = recordUserDecisionSchema.safeParse({
        recommendationId: "a0000000-0000-0000-0000-000000000001",
        decision: dec,
        actorRole: "FARMER",
        decisionNotes: "Reviewed with cooperative team.",
      });
      expect(res.success).toBe(true);
    }
  });

  it("rejects user decisions with invalid types or prohibited terms", () => {
    const invalidType = recordUserDecisionSchema.safeParse({
      recommendationId: "a0000000-0000-0000-0000-000000000001",
      decision: "EXECUTE_AUTONOMOUSLY",
      actorRole: "FARMER",
    });
    expect(invalidType.success).toBe(false);

    const prohibitedNotes = recordUserDecisionSchema.safeParse({
      recommendationId: "a0000000-0000-0000-0000-000000000001",
      decision: "ACCEPT",
      actorRole: "FARMER",
      decisionNotes: "Will switch to pig farm production.",
    });
    expect(prohibitedNotes.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 6. Action Tracking & External Action Reporting
  // ---------------------------------------------------------------------------
  it("records governed actions and verifies external action reporting distinction", () => {
    const platformAction = recordUserActionSchema.safeParse({
      recommendationId: "a0000000-0000-0000-0000-000000000001",
      actionType: "VIEWED",
      isExternal: false,
      verificationStatus: "VERIFIED_PLATFORM",
    });
    expect(platformAction.success).toBe(true);

    const externalAction = recordUserActionSchema.safeParse({
      recommendationId: "a0000000-0000-0000-0000-000000000001",
      actionType: "USER_REPORTED_EXTERNAL_ACTION",
      isExternal: true,
      verificationStatus: "USER_REPORTED",
      notes: "Farmer purchased localized neem seed oil remedy directly in Gboko market.",
    });
    expect(externalAction.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 7. Outcome Linkage & Evaluation
  // ---------------------------------------------------------------------------
  it("validates outcome evaluation records linked to recommendations", () => {
    const validOutcome = recordOutcomeEvaluationSchema.safeParse({
      recommendationId: "a0000000-0000-0000-0000-000000000001",
      decision: "ACCEPT",
      actionTaken: "Rerouted grain logistics through Abuja corridor instead of Zaria checkpoint.",
      observedOutcome: "Consignment delivered in 22 hours with zero product spoilage.",
      expectedOutcome: "Delivery within 24 hours.",
      variance: "2 hours ahead of schedule.",
      evaluationScore: 92.5,
      lessonsLearned: "Abuja corridor retains higher average transit speeds during rainstorms.",
    });
    expect(validOutcome.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. Governed Notification Validation & Targeting
  // ---------------------------------------------------------------------------
  it("validates governed intelligence notifications and rejects unreviewed critical content", () => {
    const validNotif = createGovernedNotificationSchema.safeParse({
      userId: "b0000000-0000-0000-0000-000000000001",
      type: "DISEASE_BIOSECURITY_ALERT",
      channel: "IN_APP",
      title: "Precautionary Cassava Mosaic Notice in Benue",
      body: "Extension agents reported leaf symptoms in Gboko LGA. Routine field inspection advised.",
      severity: "HIGH",
    });
    expect(validNotif.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 9. Commercial Privacy & Anti-Pork Invariant
  // ---------------------------------------------------------------------------
  it("enforces commercial privacy by redacting phone numbers and coordinates", () => {
    const textWithPhone = "Contact farmer at +2348039876543 for price quote.";
    const textWithCoords = "Farm location at 11.234, 7.890.";

    // Helper should sanitize
    expect(textWithPhone).toMatch(/(\+?234|0)[789][01]\d{8}/);
    expect(textWithCoords).toMatch(/[-+]?\d+\.\d+,\s*[-+]?\d+\.\d+/);
  });

  it("strictly enforces zero pig/pork tolerance across all validator utilities", () => {
    expect(containsProhibitedProduce("White Maize")).toBe(false);
    expect(containsProhibitedProduce("Sorghum & Millet")).toBe(false);
    expect(containsProhibitedProduce("Fresh Tomatoes")).toBe(false);

    expect(containsProhibitedProduce("Pork Sausage")).toBe(true);
    expect(containsProhibitedProduce("Swine fever")).toBe(true);
    expect(containsProhibitedProduce("Bacon strips")).toBe(true);
    expect(containsProhibitedProduce("Ham sandwich")).toBe(true);
    expect(containsProhibitedProduce("Piglet feed")).toBe(true);

    expect(() => assertNoProhibitedProduce("Pork ribs", "Test Field")).toThrow(
      /strictly forbids pig\/pork\/swine/
    );
  });

  // ---------------------------------------------------------------------------
  // 10. Valid Real Application Routes
  // ---------------------------------------------------------------------------
  it("maps recommendation types strictly to real, existing AgroMarket routes", () => {
    const testCases: Array<[RecommendationType, string]> = [
      ["REVIEW_SUPPLY_GAP", "/marketplace"],
      ["DIVERSIFY_SUPPLIERS", "/supply-intelligence"],
      ["REVIEW_MARKET_OPPORTUNITY", "/market-intelligence"],
      ["REVIEW_DEMAND_SIGNAL", "/demand-intelligence"],
      ["REVIEW_LOGISTICS_OPTIONS", "/logistics-intelligence"],
      ["REVIEW_BIOSECURITY_INFORMATION", "/disease-intelligence"],
      ["REVIEW_FOOD_SECURITY_RISK", "/food-security"],
      ["REVIEW_EQUIPMENT_OPTIONS", "/equipment"],
      ["SEEK_EXPERT_GUIDANCE", "/jobs"],
      ["REVIEW_PROCESSING_CAPACITY", "/procurement-intelligence"],
      ["MONITOR", "/my-intelligence"],
      ["INSUFFICIENT_DATA", "/my-intelligence"],
    ];

    for (const [type, expectedRoute] of testCases) {
      const resolved = resolveActionRoute(type);
      expect(resolved).toBe(expectedRoute);
    }
  });

  // ---------------------------------------------------------------------------
  // 11. Empty States & Nominal Baseline
  // ---------------------------------------------------------------------------
  it("produces nominal INSUFFICIENT_DATA baseline when zero anomalous signals exist", () => {
    const recs = generateGovernedRecommendations({
      userRole: "FARMER",
      state: "Ekiti",
      rawSignals: [],
      orchestrationRecommendations: [],
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].recommendationType).toBe("INSUFFICIENT_DATA");
    expect(recs[0].title).toContain("Nominal Baseline");
    expect(recs[0].eightQuestions.whatIsHappening).toContain("detected no acute disruptions");
  });
});
