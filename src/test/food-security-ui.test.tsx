// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FoodSecurityDashboard } from "@/features/food-security/components/food-security-dashboard";
import {
  FoodSecuritySnapshotRecord,
  FoodSecurityAlertRecord,
  CriticalDependencyItem,
} from "@/features/food-security/types";

vi.mock("@/features/food-security/actions", () => ({
  runFoodSecurityAction: vi.fn(),
  reviewFoodSecurityAlertAction: vi.fn(),
}));

describe("FoodSecurityDashboard UI Component", () => {
  const mockStats = {
    averagePressureScore: 54.5,
    averageResilienceScore: 68.2,
    activeAlertsCount: 3,
    criticalAlertsCount: 1,
    highPressureCommoditiesCount: 2,
    stressedRegionsCount: 1,
    criticalDependenciesCount: 2,
    totalEvaluatedStatesCount: 5,
  };

  it("renders non-governmental disclaimer banner and executive dashboard header", () => {
    render(
      <FoodSecurityDashboard
        initialSnapshots={[]}
        initialResilience={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText(/AgroMarket analytical indicator — not an official government food-security classification/i)
    ).toBeDefined();
    expect(
      screen.getByText("Evaluate Food Security & Resilience Early Warning")
    ).toBeDefined();
    expect(screen.getByText("Run Early Warning")).toBeDefined();
  });

  it("renders 4 overview KPI cards with statistical metrics", () => {
    render(
      <FoodSecurityDashboard
        initialSnapshots={[]}
        initialResilience={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Avg Pressure Index")).toBeDefined();
    expect(screen.getByText("Avg Resilience Score")).toBeDefined();
    expect(screen.getByText("Active Alerts")).toBeDefined();
    expect(screen.getByText("Critical Dependencies")).toBeDefined();
    expect(screen.getByText("54.5")).toBeDefined();
    expect(screen.getByText("68.2")).toBeDefined();
  });

  it("renders empty state messages when collections are unpopulated", () => {
    render(
      <FoodSecurityDashboard
        initialSnapshots={[]}
        initialResilience={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("No snapshots recorded yet. Run an analysis above.")
    ).toBeDefined();
    expect(
      screen.getByText("No active early-warning alerts. System monitoring nominal.")
    ).toBeDefined();
  });

  it("renders populated snapshot records, alerts, and critical dependencies", () => {
    const mockSnapshot: FoodSecuritySnapshotRecord = {
      id: "snap-1",
      commodity: "White Maize",
      state: "Kano",
      lga: "Dala",
      geopolitical_zone: "North West",
      pressure_score: 78.5,
      pressure_level: "CRITICAL_PRESSURE",
      component_scores: {
        supplyPressure: 22,
        demandPressure: 13,
        marketPricePressure: 14,
        regionalSupplyGap: 12,
        productionRisk: 7,
        logisticsRisk: 8,
        securityRisk: 4,
        processingBottleneck: 2,
      },
      availability_status: "SEVERE_DEFICIT",
      affordability_status: "SEVERE_PRESSURE",
      access_status: "ACCESS_CONSTRAINT",
      stability_status: "SEVERE_VOLATILITY",
      key_drivers: ["High wholesale deficit in Kano terminal market"],
      constraints: ["Transit friction along northern route"],
      missing_evidence: [],
      confidence: 0.92,
    };

    const mockAlert: FoodSecurityAlertRecord = {
      id: "alert-1",
      title: "Elevated Maize Supply Pressure in Kano",
      commodity: "White Maize",
      state: "Kano",
      lga: "Dala",
      severity: "CRITICAL",
      status: "DRAFT",
      summary: "Significant wholesale supply deficit detected in Dawanau market basin.",
      evidence_summary: "Market volume -35% vs 30-day baseline.",
      contributing_signals: ["FOOD_SECURITY_PRESSURE_INCREASE"],
      source_governance: {
        sourceName: "Platform Trade Feed",
        sourceType: "MARKET_INTELLIGENCE",
        verificationStatus: "VERIFIED",
        dataTimestamp: new Date().toISOString(),
      },
      is_public: false,
      confidence: 0.9,
    };

    const mockDependency: CriticalDependencyItem = {
      commodity: "White Maize",
      state: "Kano",
      dependencyType: "REGIONAL_SUPPLY_CONCENTRATION",
      dominantEntity: "Dawanau Market Basin",
      concentrationRatio: 85,
      thresholdExceeded: 70,
      alternativeOptionsAvailable: 1,
      riskAssessment: "High concentration of grain assembly at single terminal.",
    };

    render(
      <FoodSecurityDashboard
        initialSnapshots={[mockSnapshot]}
        initialResilience={[]}
        initialDependencies={[mockDependency]}
        initialAlerts={[mockAlert]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("White Maize")).toBeDefined();
    expect(screen.getByText("Elevated Maize Supply Pressure in Kano")).toBeDefined();
    expect(screen.getByText("DRAFT")).toBeDefined();
    expect(screen.getByText("Publish to Public Feed")).toBeDefined();
  });

  it("navigates across dashboard tabs smoothly", () => {
    render(
      <FoodSecurityDashboard
        initialSnapshots={[]}
        initialResilience={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    const alertTabButton = screen.getByText(/Alert Center/i);
    fireEvent.click(alertTabButton);
    expect(
      screen.getByText(/Candidate alerts are generated deterministically and held in/i)
    ).toBeDefined();

    const resilienceTabButton = screen.getByText("Agricultural Resilience");
    fireEvent.click(resilienceTabButton);
    expect(
      screen.getByText("Deterministic Agricultural Resilience Model")
    ).toBeDefined();
  });
});
