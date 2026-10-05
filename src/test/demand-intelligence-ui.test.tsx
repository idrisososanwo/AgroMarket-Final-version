// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemandIntelligenceDashboard } from "@/features/demand-intelligence/components/demand-intelligence-dashboard";

vi.mock("@/features/demand-intelligence/actions", () => ({
  runDemandForecastingAction: vi.fn(),
}));

describe("DemandIntelligenceDashboard Component", () => {
  it("renders the dashboard header and form controls properly", () => {
    render(<DemandIntelligenceDashboard initialSnapshots={[]} />);

    expect(
      screen.getByText("Demand Forecasting & Demand Intelligence Agent")
    ).toBeDefined();
    expect(
      screen.getByText(/Synthesizes consumer orders, institutional B2B demands, shared purchase pools/i)
    ).toBeDefined();
    expect(screen.getByText("Analyze Commodity Demand")).toBeDefined();
    expect(screen.getByText("Run Demand Intelligence Agent")).toBeDefined();
  });

  it("gracefully displays empty state when no historical evaluations exist", () => {
    render(<DemandIntelligenceDashboard initialSnapshots={[]} />);

    expect(
      screen.getByText("No demand snapshots logged yet")
    ).toBeDefined();
    expect(
      screen.getByText(
        /Select a commodity and region above and click "Run Demand Intelligence Agent" to begin./i
      )
    ).toBeDefined();
  });

  it("renders provided demand intelligence snapshots in table", () => {
    const mockSnapshots = [
      {
        id: "snap-1",
        commodity: "Roma Tomatoes",
        state: "Lagos",
        demandPressureScore: 78.5,
        demandPressureLevel: "ACUTE" as const,
        forecastDirection: "SHARP_INCREASE" as const,
        forecastConfidence: 0.85,
        forecastHorizonDays: 7,
        predictedDemandVolume: 4200,
        volumeUnit: "KG",
        b2bDemandVolume: 2500,
        consumerOrdersCount: 18,
        consumerOrdersVolume: 3500,
        sharedPurchaseDemandVolume: 600,
        volatilityLevel: "MODERATE" as const,
        unmetDemandDetected: true,
        demandConcentration: "BALANCED",
        confidence: 0.85,
        drivers: ["30-day demand expansion of +32%"],
        risks: [],
        evidenceCount: 22,
        calculatedAt: new Date().toISOString(),
      },
    ];

    render(<DemandIntelligenceDashboard initialSnapshots={mockSnapshots} />);

    expect(screen.getAllByText("Roma Tomatoes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lagos").length).toBeGreaterThan(0);
    expect(screen.getByText("78.5/100")).toBeDefined();
    expect(screen.getByText("SHARP INCREASE")).toBeDefined();
  });

  it("renders the mandatory decision-support disclaimer notice", () => {
    render(<DemandIntelligenceDashboard initialSnapshots={[]} />);

    expect(screen.getByText("Decision-Support Infrastructure Notice")).toBeDefined();
    expect(
      screen.getByText(/The Demand Forecasting & Demand Intelligence Agent is an evidence-grounded decision support tool/i)
    ).toBeDefined();
  });
});
