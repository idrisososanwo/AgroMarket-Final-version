// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiseaseIntelligenceDashboard } from "@/features/disease-biosecurity/components/disease-intelligence-dashboard";
import {
  DiseaseSnapshotRecord,
  DiseaseObservationItem,
  BiosecurityDependencyItem,
  DiseaseAlertItem,
  DiseaseOverviewStats,
} from "@/features/disease-biosecurity/types";

vi.mock("@/features/disease-biosecurity/actions", () => ({
  runDiseaseIntelligenceAction: vi.fn(),
  reviewDiseaseAlertAction: vi.fn(),
}));

describe("DiseaseIntelligenceDashboard UI Component", () => {
  const mockStats: DiseaseOverviewStats = {
    averageRiskScore: 42.5,
    averageResilienceScore: 65.0,
    activeObservationsCount: 3,
    activeAlertsCount: 2,
    criticalAlertsCount: 1,
    monitoredCommoditiesCount: 4,
    monitoredStatesCount: 6,
    verifiedSourcesRatio: 0.85,
  };

  it("renders non-veterinary regulatory disclaimer banner and evaluation runner", () => {
    render(
      <DiseaseIntelligenceDashboard
        initialSnapshots={[]}
        initialObservations={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText(/AgroMarket analytical indicator — not an official government disease classification/i)
    ).toBeDefined();
    expect(
      screen.getByText("Evaluate Agricultural Disease & Biosecurity Risk")
    ).toBeDefined();
    expect(screen.getByText("Run Disease Evaluation")).toBeDefined();
  });

  it("renders 4 overview KPI cards with statistical metrics", () => {
    render(
      <DiseaseIntelligenceDashboard
        initialSnapshots={[]}
        initialObservations={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Disease Risk Index")).toBeDefined();
    expect(screen.getByText("Biosecurity Resilience")).toBeDefined();
    expect(screen.getByText("Active Signals")).toBeDefined();
    expect(screen.getByText("Governed Alerts")).toBeDefined();
    expect(screen.getByText("42.5")).toBeDefined();
    expect(screen.getByText("65")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("renders empty state messages when collections are unpopulated", () => {
    render(
      <DiseaseIntelligenceDashboard
        initialSnapshots={[]}
        initialObservations={[]}
        initialDependencies={[]}
        initialAlerts={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("No disease snapshots recorded yet. Run an evaluation above.")
    ).toBeDefined();
    expect(
      screen.getByText("No active early-warning disease alerts. System nominal.")
    ).toBeDefined();
  });

  it("renders populated snapshot records and switches tabs seamlessly", () => {
    const mockSnapshot: DiseaseSnapshotRecord = {
      state: "Kano",
      lga: "Dala",
      commodity: "Broiler Chicken",
      category: "POULTRY",
      risk_score: 68.0,
      risk_level: "HIGH_RISK",
      resilience_score: 55.0,
      resilience_level: "MODERATE_RESILIENCE",
      risk_components: {
        evidenceStrength: 16,
        signalConvergence: 14,
        geographicConcentration: 12,
        commodityExposure: 12,
        productionImpactEvidence: 6,
        movementBiosecurityExposure: 4,
        supplyImpactEvidence: 4,
      },
      resilience_components: {
        productionDiversification: 8,
        regionalDiversification: 8,
        supplierSourceDiversity: 6,
        movementFlexibility: 8,
        aggregationFlexibility: 6,
        processingRedundancy: 6,
        marketDiversification: 6,
        observedResponseCapacity: 7,
      },
      evidence_strength: 16,
      signal_convergence: 14,
      production_impact: 6,
      movement_exposure: 4,
      supply_impact: 4,
      key_drivers: ["Multiple official health bulletins recorded"],
      missing_evidence: [],
      vulnerability_factors: ["High concentration on arterial highway"],
      adaptive_capacities: ["Active extension presence"],
      confidence: 0.85,
      calculated_at: new Date().toISOString(),
    };

    const mockObservation: DiseaseObservationItem = {
      observationType: "MORTALITY_SIGNAL",
      sourceName: "NVRI Field Bulletin",
      sourceType: "RESEARCH_INSTITUTE",
      verificationStatus: "OFFICIAL",
      reportingAuthority: "NVRI Vom",
      state: "Kano",
      commodity: "Broiler Chicken",
      evidenceSummary: "Elevated mortality notice in commercial broiler flock",
      confidence: 0.9,
    };

    const mockDependency: BiosecurityDependencyItem = {
      state: "Kano",
      commodity: "Broiler Chicken",
      dependencyType: "REGIONAL_PRODUCTION_CONCENTRATION",
      dominantEntity: "Kano Central Poultry Cluster",
      concentrationPercentage: 82.0,
      severity: "HIGH",
      status: "ACTIVE",
      riskAssessment: "High cluster concentration elevates local transmission vulnerability",
      evidence: "82% of observed poultry listings located in single farming cluster",
      confidence: 0.88,
    };

    const mockAlert: DiseaseAlertItem = {
      id: "alert-test-1",
      alertCode: "BIO-KAN-001234",
      title: "Potential Avian Health Signal in Kano",
      severity: "HIGH",
      status: "REVIEW",
      state: "Kano",
      commodity: "Broiler Chicken",
      summary: "Signal convergence confirmed across NVRI bulletins and extension logs.",
      evidenceSources: [],
      verificationStatus: "OFFICIAL",
      limitations: "Analytical early warning. Not a clinical diagnosis.",
      officialConsultationAdvice: "Consult certified veterinary personnel before initiating treatment.",
      confidence: 0.85,
      createdAt: new Date().toISOString(),
    };

    render(
      <DiseaseIntelligenceDashboard
        initialSnapshots={[mockSnapshot]}
        initialObservations={[mockObservation]}
        initialDependencies={[mockDependency]}
        initialAlerts={[mockAlert]}
        initialStats={mockStats}
      />
    );

    // Initial overview displays snapshot
    expect(screen.getAllByText("Broiler Chicken").length).toBeGreaterThan(0);
    expect(screen.getByText(/HIGH RISK/i)).toBeDefined();

    // Click Disease Signals tab
    const signalsTab = screen.getByRole("button", { name: /disease signals/i });
    fireEvent.click(signalsTab);
    expect(screen.getByText(/NVRI Field Bulletin/i)).toBeDefined();
    expect(screen.getByText(/Elevated mortality notice/i)).toBeDefined();

    // Click Value-Chain Impact tab
    const valueChainTab = screen.getByRole("button", { name: /value-chain impact/i });
    fireEvent.click(valueChainTab);
    expect(screen.getByText("Calibrated Value-Chain Impact Chain")).toBeDefined();
    expect(screen.getByText(/Correlation is not causation/i)).toBeDefined();

    // Click Biosecurity tab
    const biosecurityTab = screen.getByRole("button", { name: /biosecurity/i });
    fireEvent.click(biosecurityTab);
    expect(screen.getByText(/Kano Central Poultry Cluster/i)).toBeDefined();
    expect(screen.getAllByText(/82%/i).length).toBeGreaterThan(0);

    // Click Governed Alerts tab
    const alertsTab = screen.getByRole("button", { name: /governed alerts/i });
    fireEvent.click(alertsTab);
    expect(screen.getByText("Potential Avian Health Signal in Kano")).toBeDefined();
    expect(screen.getByText("Approve & Publish Alert")).toBeDefined();
  });
});
