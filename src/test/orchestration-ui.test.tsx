// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntelligenceCommandCenter } from "@/features/orchestration/components/intelligence-command-center";
import {
  OrchestrationSnapshotRecord,
  OrchestrationRecommendationItem,
  IntelligenceConflictItem,
  OrchestrationOverviewStats,
} from "@/features/orchestration/types";

// Mock server actions to prevent network/db calls during component testing
vi.mock("@/features/orchestration/actions", () => ({
  runOrchestrationAction: vi.fn().mockResolvedValue({
    success: true,
    message: "Evaluation executed",
    result: {
      snapshot: {
        scenario_type: "MULTI_DOMAIN_RISK_SCENARIO",
        priority_score: 82.5,
        priority_level: "CRITICAL",
        orchestration_confidence: 0.88,
        domain_score: 75.0,
        evidence_confidence: 0.86,
        state: "Kano",
        commodity: "Maize",
        affected_domains: ["MARKET", "SUPPLY", "DEMAND"],
        contributing_agents: ["MARKET_INTELLIGENCE_AGENT"],
        contributing_signals: [],
        scenario_summary: "Systemic multi-domain risk identified.",
        deterministic_findings: {},
        conflict_detected: false,
        conflict_details: null,
        evidence_summary: "Multi-agent evidence aligned.",
        component_breakdown: {
          crossDomainSeverity: 20,
          evidenceConfidence: 18,
          foodSecurityExposure: 12,
          supplyExposure: 12,
          geographicConcentration: 10,
          logisticsExposure: 4,
          procurementExposure: 4,
          timeSensitivity: 4,
          totalScore: 84,
        },
        generated_at: new Date().toISOString(),
      },
      scenarioType: "MULTI_DOMAIN_RISK_SCENARIO",
      priorityScore: 82.5,
      priorityLevel: "CRITICAL",
      confidenceMetrics: {
        domainScore: 75,
        evidenceConfidence: 0.86,
        orchestrationConfidence: 0.88,
        confidenceDegradation: 0,
        independentSourcesCount: 5,
        conflictsPenaltyApplied: 0,
      },
      breakdown: {
        crossDomainSeverity: 20,
        evidenceConfidence: 18,
        foodSecurityExposure: 12,
        supplyExposure: 12,
        geographicConcentration: 10,
        logisticsExposure: 4,
        procurementExposure: 4,
        timeSensitivity: 4,
        totalScore: 84,
      },
      conflicts: [],
      recommendations: [],
    },
  }),
  reviewRecommendationAction: vi.fn().mockResolvedValue({ success: true }),
  resolveConflictAction: vi.fn().mockResolvedValue({ success: true }),
  recordOutcomeAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("IntelligenceCommandCenter UI Component", () => {
  const mockStats: OrchestrationOverviewStats = {
    totalSnapshotsCount: 12,
    criticalScenariosCount: 3,
    highScenariosCount: 5,
    activeConflictsCount: 1,
    proposedRecommendationsCount: 4,
    averagePriorityScore: 68.5,
    averageOrchestrationConfidence: 0.84,
    activeMonitoredCommoditiesCount: 6,
    activeMonitoredStatesCount: 8,
  };

  it("renders non-autonomous regulatory disclaimer banner and evaluation runner", () => {
    render(
      <IntelligenceCommandCenter
        initialSnapshots={[]}
        initialRecommendations={[]}
        initialConflicts={[]}
        initialOutcomes={[]}
        initialStats={mockStats}
      />
    );

    // Disclaimer banner
    expect(
      screen.getByText(/AgroMarket Cross-Domain Agricultural Intelligence Command Center/i)
    ).toBeDefined();

    // Evaluation Runner controls
    expect(
      screen.getByText("Run Cross-Domain Orchestration Evaluation")
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /run orchestration/i })).toBeDefined();
  });

  it("renders 4 master KPI summary cards with statistical metrics", () => {
    render(
      <IntelligenceCommandCenter
        initialSnapshots={[]}
        initialRecommendations={[]}
        initialConflicts={[]}
        initialOutcomes={[]}
        initialStats={mockStats}
      />
    );

    expect(screen.getByText("Cross-Domain Priority")).toBeDefined();
    expect(screen.getByText("68.5")).toBeDefined();
    expect(screen.getByText("Orchestration Confidence")).toBeDefined();
    expect(screen.getByText("84%")).toBeDefined();
    expect(screen.getByText("Active Conflicts")).toBeDefined();
    expect(screen.getByText("Governed Recommendations")).toBeDefined();
  });

  it("renders empty state messages when collections are unpopulated", () => {
    render(
      <IntelligenceCommandCenter
        initialSnapshots={[]}
        initialRecommendations={[]}
        initialConflicts={[]}
        initialOutcomes={[]}
        initialStats={mockStats}
      />
    );

    expect(
      screen.getByText("No orchestration snapshots available. Run an evaluation above.")
    ).toBeDefined();
  });

  it("renders populated snapshot records and switches tabs across command center sections", () => {
    const mockSnapshot: OrchestrationSnapshotRecord = {
      scenario_type: "MULTI_DOMAIN_RISK_SCENARIO",
      priority_score: 78.0,
      priority_level: "HIGH",
      orchestration_confidence: 0.85,
      domain_score: 72.0,
      evidence_confidence: 0.84,
      geographic_scope: "Kano:Dala",
      state: "Kano",
      lga: "Dala",
      geopolitical_zone: "North-West",
      commodity: "Maize",
      commodity_category: "GRAINS",
      affected_domains: ["MARKET", "SUPPLY", "DEMAND"],
      contributing_agents: ["MARKET_INTELLIGENCE_AGENT", "SUPPLY_MATCHING_AGENT"],
      contributing_signals: [
        {
          domain: "MARKET",
          signalType: "PRICE_INCREASE",
          score: 75,
          severity: "HIGH",
          sources: ["Dawanau Price Index"],
        },
      ],
      scenario_summary: "Multiple independent domains indicate elevated commodity stress in Kano.",
      deterministic_findings: {},
      conflict_detected: true,
      conflict_details: null,
      evidence_summary: "Field price tickets and producer deficit logs aligned.",
      component_breakdown: {
        crossDomainSeverity: 18,
        evidenceConfidence: 16.8,
        foodSecurityExposure: 11,
        supplyExposure: 12,
        geographicConcentration: 10,
        logisticsExposure: 3.5,
        procurementExposure: 3.5,
        timeSensitivity: 4,
        totalScore: 78.8,
      },
      generated_at: new Date().toISOString(),
    };

    const mockConflict: IntelligenceConflictItem = {
      id: "conf-1",
      conflictType: "MARKET_SUPPLY_CONTRADICTION",
      domainA: "MARKET",
      domainB: "SUPPLY",
      signalA: "SUPPLY_SURPLUS",
      signalB: "SUPPLY_SHORTAGE",
      state: "Kano",
      commodity: "Maize",
      severity: "HIGH",
      status: "ACTIVE",
      explanation: "Market price logs indicate surplus while physical matching flags deficit.",
      confidenceImpact: 0.25,
      recommendedHumanReview: "Reconcile field inventory logs with price tickers.",
    };

    const mockRecommendation: OrchestrationRecommendationItem = {
      id: "rec-1",
      title: "Activate Multi-Domain Sourcing Hedge",
      summary: "Engage alternative producer cooperatives in adjacent basins.",
      actionPath: "/supply-intelligence",
      priority: "HIGH",
      confidence: 0.86,
      affectedDomains: ["SUPPLY", "PROCUREMENT"],
      affectedCommodities: ["Maize"],
      affectedStates: ["Kano"],
      status: "PROPOSED",
      advisoryDisclaimer: "Cross-domain advisory recommendation only.",
    };

    render(
      <IntelligenceCommandCenter
        initialSnapshots={[mockSnapshot]}
        initialRecommendations={[mockRecommendation]}
        initialConflicts={[mockConflict]}
        initialOutcomes={[]}
        initialStats={mockStats}
      />
    );

    // Initial Overview displays active scenario
    expect(screen.getAllByText(/MULTI DOMAIN RISK SCENARIO/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Priority: HIGH/i).length).toBeGreaterThan(0);

    // Click Critical Scenarios Tab
    const criticalTab = screen.getByRole("button", { name: /critical scenarios/i });
    fireEvent.click(criticalTab);
    expect(screen.getByText(/Critical & High Systemic Priority Scenarios/i)).toBeDefined();

    // Click Active Conflicts Tab
    const conflictsTab = screen.getByRole("button", { name: /conflicts/i });
    fireEvent.click(conflictsTab);
    expect(screen.getByText(/MARKET SUPPLY CONTRADICTION/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /mark reconciled/i })).toBeDefined();

    // Click Governed Recommendations Tab
    const recsTab = screen.getByRole("button", { name: /recommendations/i });
    fireEvent.click(recsTab);
    expect(screen.getByText("Activate Multi-Domain Sourcing Hedge")).toBeDefined();
    expect(screen.getByRole("button", { name: /mark reviewed/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /accept/i })).toBeDefined();

    // Click AI Advisory Tab
    const advisoryTab = screen.getByRole("button", { name: /ai advisory/i });
    fireEvent.click(advisoryTab);
    expect(screen.getByText(/Deterministic Findings Authoritative:/i)).toBeDefined();

    // Click Agent Contributions Tab
    const agentsTab = screen.getByRole("button", { name: /agent contributions/i });
    fireEvent.click(agentsTab);
    expect(screen.getByText("Market Intelligence")).toBeDefined();
    expect(screen.getByText("Agricultural Biosecurity")).toBeDefined();
  });
});
