// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupplyMatchingDashboard } from "@/features/supply-matching/components/supply-matching-dashboard";

vi.mock("@/features/supply-matching/actions", () => ({
  runSupplyMatchingAction: vi.fn(),
  updateCoordinationRecommendationAction: vi.fn(),
}));

describe("SupplyMatchingDashboard Component", () => {
  const mockStats = {
    totalSnapshotsCount: 3,
    activeDemandsCount: 3,
    totalMatchedVolume: 8500,
    totalUnmatchedGap: 1500,
    averageMatchScore: 82,
    multiSourceAggregationCount: 1,
    processingBottlenecksCount: 0,
    securityDisruptionsCount: 0,
  };

  it("renders the dashboard header, advisory notice, and execution controls", () => {
    render(
      <SupplyMatchingDashboard
        initialSnapshots={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("Supply Matching & Agricultural Coordination Console")
    ).toBeDefined();
    expect(screen.getByText("Advisory Coordination Active")).toBeDefined();
    expect(
      screen.getByText(/The agent deterministically discovers and scores alignment/i)
    ).toBeDefined();
    expect(screen.getByText("Run Deterministic Supply Match Evaluation")).toBeDefined();
    expect(screen.getByText("Execute Supply Matching")).toBeDefined();
  });

  it("renders overview metric cards correctly", () => {
    render(
      <SupplyMatchingDashboard
        initialSnapshots={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Matched Volume")).toBeDefined();
    expect(screen.getByText("8,500")).toBeDefined();
    expect(screen.getByText("Unmatched Gap")).toBeDefined();
    expect(screen.getByText("1,500")).toBeDefined();
    expect(screen.getByText("Multi-Source Pools")).toBeDefined();
  });

  it("renders empty state when no historical snapshots exist", () => {
    render(
      <SupplyMatchingDashboard
        initialSnapshots={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText(/No supply matching evaluations recorded yet/i)
    ).toBeDefined();
  });

  it("renders snapshot card in match explorer when provided", () => {
    const mockSnapshots = [
      {
        id: "snap-123",
        demand_id: "dem-1",
        commodity: "Yellow Maize",
        state: "Kaduna",
        lga: "Chikun",
        target_quantity: 5000,
        matched_quantity: 4500,
        remaining_gap: 500,
        unit: "KG",
        fulfillment_percentage: 90,
        match_classification: "GOOD_MATCH" as const,
        coordination_type: "MULTI_SOURCE_AGGREGATION" as const,
        match_score: 82,
        component_scores: {
          commodityCompatibility: 30,
          quantityCompatibility: 18,
          locationCompatibility: 12,
          availabilityCompatibility: 12,
          specificationCompatibility: 8,
          processingAggregationFit: 5,
          logisticsCompatibility: 4,
        },
        candidates_count: 3,
        aggregation_pool_count: 1,
        processing_required: false,
        processing_facility_id: null,
        logistics_corridor: "Kaduna -> Kano",
        constraints: [],
        missing_evidence: [],
        confidence: 0.85,
        calculated_at: new Date().toISOString(),
      },
    ];

    render(
      <SupplyMatchingDashboard
        initialSnapshots={mockSnapshots}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Yellow Maize")).toBeDefined();
    expect(screen.getByText(/• Kaduna/i)).toBeDefined();
    expect(screen.getByText(/82\/100/i)).toBeDefined();
    expect(screen.getByText(/3 source\(s\)/i)).toBeDefined();
  });
});
