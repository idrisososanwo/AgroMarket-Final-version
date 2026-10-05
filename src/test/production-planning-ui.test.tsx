// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductionPlanningDashboard } from "@/features/production-planning/components/production-planning-dashboard";

vi.mock("@/features/production-planning/actions", () => ({
  runProductionPlanningAction: vi.fn(),
}));

describe("ProductionPlanningDashboard Component", () => {
  it("renders the dashboard header and form controls properly", () => {
    render(<ProductionPlanningDashboard initialSnapshots={[]} />);

    expect(
      screen.getByText("Production Planning & Farm Intelligence Agent")
    ).toBeDefined();
    expect(
      screen.getByText(/Integrates production context, market intelligence, seasonality/i)
    ).toBeDefined();
    expect(screen.getByText("Evaluate Production Planning")).toBeDefined();
    expect(screen.getByText("Run Production Agent")).toBeDefined();
  });

  it("gracefully displays empty state when no historical evaluations exist", () => {
    render(<ProductionPlanningDashboard initialSnapshots={[]} />);

    expect(
      screen.getByText("No production planning evaluations recorded yet")
    ).toBeDefined();
    expect(
      screen.getByText(
        /Select a commodity and state above to run an initial empirical evaluation/i
      )
    ).toBeDefined();
  });

  it("renders provided production planning snapshots in table", () => {
    const mockSnapshots = [
      {
        id: "snap-1",
        commodity: "Roma Tomatoes",
        state: "Kano",
        domain: "CROPS" as const,
        opportunityScore: 84.5,
        riskScore: 22.0,
        opportunityLevel: "HIGH_OPPORTUNITY" as const,
        riskLevel: "LOW" as const,
        marketDemandStatus: "SURGING",
        supplyBalanceStatus: "SHORTAGE",
        seasonalAlignment: "PEAK_WINDOW" as const,
        inputConstraintLevel: "NONE" as const,
        processingConstraintLevel: "NONE" as const,
        confidence: 0.9,
        opportunities: ["High demand", "Supply deficit"],
        risks: [],
        constraints: [],
        evidenceCount: 15,
        calculatedAt: new Date().toISOString(),
      },
    ];

    render(<ProductionPlanningDashboard initialSnapshots={mockSnapshots} />);

    expect(screen.getAllByText("Roma Tomatoes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kano").length).toBeGreaterThan(0);
    expect(screen.getByText("CROPS")).toBeDefined();
    expect(screen.getByText(/HIGH_OPPORTUNITY/i)).toBeDefined();
  });
});
