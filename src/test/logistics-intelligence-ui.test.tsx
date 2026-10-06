// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogisticsIntelligenceDashboard } from "@/features/logistics-intelligence/components/logistics-intelligence-dashboard";
import {
  LogisticsIntelligenceSnapshotRecord,
  LogisticsCorridorDependencyItem,
  LogisticsBottleneckItem,
  LogisticsRecommendationRecord,
  LogisticsOverviewStats,
} from "@/features/logistics-intelligence/types";

vi.mock("@/features/logistics-intelligence/actions", () => ({
  runLogisticsIntelligenceAction: vi.fn(),
  reviewLogisticsRecommendationAction: vi.fn(),
}));

describe("LogisticsIntelligenceDashboard UI Component", () => {
  const mockStats: LogisticsOverviewStats = {
    averagePressureScore: 48.5,
    averageResilienceScore: 62.4,
    activeBottlenecksCount: 2,
    criticalDependenciesCount: 1,
    pendingRecommendationsCount: 3,
    activeProvidersCount: 4,
    activeDeliveriesCount: 8,
    evaluatedCorridorsCount: 5,
  };

  it("renders non-governmental disclaimer banner and evaluation runner", () => {
    render(
      <LogisticsIntelligenceDashboard
        initialSnapshots={[]}
        initialDependencies={[]}
        initialBottlenecks={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText(/AgroMarket analytical indicator — not an official government indicator/i)
    ).toBeDefined();
    expect(
      screen.getByText("Evaluate Agricultural Movement Corridor & Logistics Resilience")
    ).toBeDefined();
    expect(screen.getByText("Run Movement Evaluation")).toBeDefined();
  });

  it("renders 4 overview KPI cards with statistical metrics", () => {
    render(
      <LogisticsIntelligenceDashboard
        initialSnapshots={[]}
        initialDependencies={[]}
        initialBottlenecks={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Logistics Pressure")).toBeDefined();
    expect(screen.getByText("Logistics Resilience")).toBeDefined();
    expect(screen.getByText("Active Bottlenecks")).toBeDefined();
    expect(screen.getByText("Corridor Dependencies")).toBeDefined();
    expect(screen.getByText("48.5")).toBeDefined();
    expect(screen.getByText("62.4")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("renders empty state messages when collections are unpopulated", () => {
    render(
      <LogisticsIntelligenceDashboard
        initialSnapshots={[]}
        initialDependencies={[]}
        initialBottlenecks={[]}
        initialRecommendations={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("No logistics snapshots recorded yet. Run an evaluation above.")
    ).toBeDefined();
  });

  it("renders populated snapshot records and switches tabs seamlessly", () => {
    const mockSnapshot: LogisticsIntelligenceSnapshotRecord = {
      corridor: "Kano-Kaduna Transit Corridor",
      state: "Kano",
      lga: "Dala",
      commodity: "White Maize",
      category: "GRAINS",
      pressure_score: 72.0,
      pressure_level: "HIGH_PRESSURE",
      resilience_score: 45.0,
      resilience_level: "VULNERABLE",
      pressure_components: {
        movementDemandPressure: 15,
        capacityConstraintPressure: 16,
        deliveryDelayPressure: 12,
        corridorDependencyPressure: 14,
        disruptionPressure: 8,
        processingMovementPressure: 3,
        regionalAlternativeScarcity: 4,
      },
      resilience_components: {
        providerDiversity: 6,
        corridorDiversity: 5,
        regionalAlternativeAvailability: 6,
        processingConnectivity: 8,
        aggregationConnectivity: 7,
        marketDestinationDiversity: 5,
        movementCapacityAvailability: 4,
        disruptionRecoveryEvidence: 4,
      },
      key_drivers: ["High transit volume on single highway"],
      missing_evidence: [],
      vulnerability_factors: ["Limited secondary routes"],
      adaptive_capacities: ["Active cooperative storage"],
      confidence: 0.85,
      calculated_at: new Date().toISOString(),
    };

    const mockBottleneck: LogisticsBottleneckItem = {
      bottleneckType: "DELIVERY_BOTTLENECK",
      state: "Kano",
      corridor: "Kano-Kaduna Transit Corridor",
      commodity: "White Maize",
      severity: "HIGH",
      evidence: "35% of deliveries delayed due to checkpoint congestion",
      confidence: 0.82,
      status: "IDENTIFIED",
      firstObservedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString(),
      affectedScope: "REGIONAL_CORRIDOR",
      alternativeAvailable: true,
      recommendedAction: "Verify alternative feeder road transit with driver cooperatives",
    };

    const mockDependency: LogisticsCorridorDependencyItem = {
      corridor: "Kano-Kaduna Transit Corridor",
      state: "Kano",
      commodity: "White Maize",
      dominantEntity: "Kano-Kaduna Arterial Highway",
      movementShare: 82.0,
      thresholdExceeded: 75.0,
      alternativeOptionsAvailable: 1,
      dependencyType: "CORRIDOR_DEPENDENCY",
      severity: "CRITICAL",
      evidence: "82% of observed cereal shipments utilize single arterial corridor",
      riskAssessment: "Severe single corridor dependency creates immediate supply disruption risk.",
      confidence: 0.9,
      observedAt: new Date().toISOString(),
      status: "ACTIVE",
    };

    const mockRecommendation: LogisticsRecommendationRecord = {
      id: "rec-test-1",
      title: "Investigate Alternative Eastern Bypass Route",
      strategy: "ALTERNATIVE_CORRIDOR_REVIEW",
      state: "Kano",
      corridor: "Kano-Kaduna Transit Corridor",
      commodity: "White Maize",
      severity: "HIGH",
      status: "PROPOSED",
      summary: "Severe concentration on primary corridor suggests evaluating eastern feeder connection.",
      reasoning: "High transit volume and single highway reliance increases risk of food supply friction.",
      evidenceCitations: [
        {
          sourceType: "CORRIDOR_OBSERVATION",
          description: "Corridor movement share exceeds 80%",
          relevance: 0.9,
        },
      ],
      confidence: 0.8,
      createdAt: new Date().toISOString(),
    };

    render(
      <LogisticsIntelligenceDashboard
        initialSnapshots={[mockSnapshot]}
        initialDependencies={[mockDependency]}
        initialBottlenecks={[mockBottleneck]}
        initialRecommendations={[mockRecommendation]}
        initialStats={mockStats}
      />
    );

    // Initial overview displays snapshot
    expect(screen.getAllByText("Kano-Kaduna Transit Corridor").length).toBeGreaterThan(0);
    expect(screen.getByText(/HIGH PRESSURE/i)).toBeDefined();

    // Click Bottlenecks tab
    const bottlenecksTab = screen.getByRole("button", { name: /bottlenecks/i });
    fireEvent.click(bottlenecksTab);
    expect(screen.getByText(/DELIVERY BOTTLENECK/i)).toBeDefined();
    expect(screen.getByText(/35% of deliveries delayed/i)).toBeDefined();

    // Click Corridors tab
    const corridorsTab = screen.getByRole("button", { name: /corridor intelligence/i });
    fireEvent.click(corridorsTab);
    expect(screen.getByText(/82%.*threshold: 75%/i)).toBeDefined();

    // Click Human Review tab
    const recommendationsTab = screen.getByRole("button", { name: /human review/i });
    fireEvent.click(recommendationsTab);
    expect(screen.getByText("Investigate Alternative Eastern Bypass Route")).toBeDefined();
  });
});
