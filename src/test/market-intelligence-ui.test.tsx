// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketIntelligenceDashboard } from "@/features/market-intelligence/components/market-intelligence-dashboard";

vi.mock("@/features/market-intelligence/actions", () => ({
  runMarketIntelligenceAction: vi.fn(),
}));

describe("MarketIntelligenceDashboard Component", () => {
  it("renders the dashboard header and controls properly", () => {
    render(<MarketIntelligenceDashboard initialSnapshots={[]} />);

    expect(screen.getByText("Market Intelligence Agent")).toBeDefined();
    expect(screen.getByText(/Deterministic price, supply, and demand signals/i)).toBeDefined();
    expect(screen.getByText("Query Market Intelligence")).toBeDefined();
    expect(screen.getByText("Run Intelligence Agent")).toBeDefined();
  });

  it("gracefully displays empty state when no historical snapshots exist", () => {
    render(<MarketIntelligenceDashboard initialSnapshots={[]} />);

    expect(screen.getByText("No market pressure snapshots recorded yet")).toBeDefined();
    expect(
      screen.getByText(/Select a commodity and state above to execute an initial empirical evaluation/i)
    ).toBeDefined();
  });

  it("renders provided market pressure snapshots in table", () => {
    const mockSnapshots = [
      {
        id: "snap-1",
        commodity: "Yellow Maize",
        state: "Kaduna",
        pressureScore: 78.5,
        pressureLevel: "ACUTE" as const,
        pricePressure: 80,
        supplyPressure: 75,
        demandPressure: 70,
        disruptionPressure: 20,
        confidence: 0.85,
        drivers: ["Wholesale price appreciation"],
        risks: ["Procurement rationing"],
        evidenceCount: 14,
        calculatedAt: new Date().toISOString(),
      },
    ];

    render(<MarketIntelligenceDashboard initialSnapshots={mockSnapshots} />);

    expect(screen.getAllByText("Yellow Maize").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kaduna").length).toBeGreaterThan(0);
    expect(screen.getByText("ACUTE")).toBeDefined();
    expect(screen.getByText("78.5/100")).toBeDefined();
  });
});
