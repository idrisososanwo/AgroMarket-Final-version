// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcurementIntelligenceDashboard } from "@/features/procurement-intelligence/components/procurement-intelligence-dashboard";
import { ProcurementIntelligenceSnapshot } from "@/features/procurement-intelligence/types";

vi.mock("@/features/procurement-intelligence/actions", () => ({
  runProcurementIntelligenceAction: vi.fn(),
  reviewProcurementRecommendationAction: vi.fn(),
}));

describe("ProcurementIntelligenceDashboard Component", () => {
  const mockStats = {
    openOpportunitiesCount: 4,
    highPriorityCount: 2,
    partiallySourcedCount: 3,
    fullySourcedCount: 1,
    totalVolumeRequired: 15000,
    totalVolumeSourced: 9500,
    totalVolumeGap: 5500,
    highRiskCount: 1,
    concentrationRiskCount: 1,
    processingConstrainedCount: 0,
    securityConstrainedCount: 0,
  };

  it("renders the dashboard header, title, and pipeline runner controls", () => {
    render(
      <ProcurementIntelligenceDashboard
        initialSnapshots={[]}
        initialOpportunities={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("Procurement Intelligence & B2B Coordination Engine")
    ).toBeDefined();
    expect(
      screen.getByText(/Strictly non-autonomous: human review remains authoritative/i)
    ).toBeDefined();
    expect(screen.getByText("Run Evaluation")).toBeDefined();
  });

  it("renders overview metric cards correctly with counts and labels", () => {
    render(
      <ProcurementIntelligenceDashboard
        initialSnapshots={[]}
        initialOpportunities={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Open Opportunities")).toBeDefined();
    expect(screen.getByText("High Priority")).toBeDefined();
    expect(screen.getByText("Partially Sourced")).toBeDefined();
    expect(screen.getByText("Fully Sourced")).toBeDefined();
    expect(screen.getByText("Concentration Alert")).toBeDefined();
  });

  it("renders empty state message when snapshots list is empty", () => {
    render(
      <ProcurementIntelligenceDashboard
        initialSnapshots={[]}
        initialOpportunities={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("No procurement intelligence snapshots recorded yet.")
    ).toBeDefined();
  });

  it("renders populated snapshots with commodity, state, and priority score", () => {
    const mockSnapshot: ProcurementIntelligenceSnapshot = {
      id: "snap-1",
      demand_id: "dem-1",
      buyer_id: null,
      commodity: "White Maize",
      state: "Kano",
      lga: "Dala",
      target_quantity: 5000,
      matched_quantity: 3500,
      supply_gap: 1500,
      unit: "KG",
      fulfillment_percentage: 70,
      procurement_priority_score: 75,
      priority_components: {
        demandUrgency: 20,
        supplyGap: 16,
        demandPressure: 10,
        marketPressure: 12,
        matchQuality: 8,
        leadTimeAvailability: 6,
        riskDisruption: 3,
      },
      recommended_strategy: "MULTI_SUPPLIER",
      procurement_risk_level: "MEDIUM",
      risk_factors: ["PARTIAL_SUPPLY_DEFICIT"],
      opportunity_status: "PARTIALLY_SOURCED",
      candidate_suppliers_count: 3,
      supplier_concentration_detected: false,
      concentration_ratio: 45,
      market_pressure_level: "MODERATE",
      observed_price_min: 400,
      observed_price_max: 480,
      observed_price_median: 440,
      price_trend: "STABLE",
      estimated_procurement_cost: 2200000,
      processing_required: false,
      security_disruption_flag: false,
      constraints: [],
      missing_evidence: [],
      confidence: 0.85,
      calculated_at: new Date().toISOString(),
    };

    render(
      <ProcurementIntelligenceDashboard
        initialSnapshots={[mockSnapshot]}
        initialOpportunities={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getAllByText("White Maize").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Kano").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Priority 75/100")).toBeDefined();
    expect(screen.getByText("70% Sourced")).toBeDefined();
    expect(screen.getByText("MULTI SUPPLIER")).toBeDefined();
    expect(screen.getByText("Risk: MEDIUM")).toBeDefined();
  });
});
