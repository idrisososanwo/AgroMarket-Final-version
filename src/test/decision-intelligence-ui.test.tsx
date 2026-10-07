// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyIntelligenceDashboard } from "@/features/decision-intelligence/components/my-intelligence-dashboard";
import { DecisionDialog } from "@/features/decision-intelligence/components/decision-dialog";
import { ExplainabilityModal } from "@/features/decision-intelligence/components/explainability-modal";
import { PreferencesDrawer } from "@/features/decision-intelligence/components/preferences-drawer";
import {
  GovernedDecisionRecommendation,
  MyIntelligenceDashboardData,
} from "@/features/decision-intelligence/types";

// Mock server actions
vi.mock("@/features/decision-intelligence/actions", () => ({
  recordUserDecisionAction: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "dec-1", decision: "ACCEPT", actorRole: "FARMER" },
  }),
  recordUserActionExecutionAction: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "act-1", actionType: "VIEWED" },
  }),
  saveUserPreferencesAction: vi.fn().mockResolvedValue({
    success: true,
    data: { primaryRole: "FARMER" },
  }),
  markNotificationReadAction: vi.fn().mockResolvedValue({
    success: true,
    data: true,
  }),
}));

const mockRecommendation: GovernedDecisionRecommendation = {
  id: "rec-test-1",
  recommendationType: "REVIEW_MARKET_OPPORTUNITY",
  title: "Favorable Wholesale Maize Off-Take Window in Kano",
  summary: "Wholesale prices in Dawanau market have reached favorable margins for dry maize producers.",
  rationale: "Price divergence of 18% above seasonal baseline.",
  affectedActor: "FARMER",
  geography: { state: "Kano", lga: "Dala" },
  commodity: "White Maize",
  urgency: "HIGH",
  priority: "HIGH",
  confidence: 0.88,
  evidenceReferences: ["Dawanau Grain Market Observation"],
  contributingAgents: ["MARKET", "DEMAND"],
  contributingSignals: ["WHOLESALE_PRICE_PRESSURE"],
  limitations: "Advisory guidance. Check local buyers before dispatch.",
  actionPath: "/market-intelligence",
  status: "PROPOSED",
  advisoryDisclaimer: "Advisory only. No autonomous transactions.",
  eightQuestions: {
    whatIsHappening: "Wholesale maize prices in Kano are exhibiting strong seasonal demand.",
    whyDoesItMatter: "Producers can capture an additional margin before harvest influx.",
    whoDoesItAffect: "Grain farmers in Kano and adjoining North West clusters.",
    where: "Kano (Dawanau Wholesale Hub)",
    whatEvidenceSupportsIt: "Continuous transaction observation records.",
    whatCouldTheUserConsiderDoing: "Coordinate aggregated transport to reduce freight tariffs.",
    whatAreTheLimitations: "Advisory based on current weekly volumes.",
    whatHappenedAfterUserDecided: null,
  },
  explainability: {
    contributingAgents: ["MARKET", "DEMAND"],
    keySignals: ["WHOLESALE_PRICE_PRESSURE"],
    evidenceConfidence: 0.88,
    dataRecencyHours: 4,
    relevantGeography: { state: "Kano", lga: "Dala" },
    relevantCommodity: "White Maize",
    limitations: ["High market volatility during harvest transit"],
    explanationSummary: "Derived from Market Intelligence Agent observations.",
  },
  createdAt: new Date().toISOString(),
};

const mockDashboardData: MyIntelligenceDashboardData = {
  userRole: "FARMER",
  preferences: {
    userId: "test-user-id",
    primaryRole: "FARMER",
    preferredStates: ["Kano"],
    preferredLgas: [],
    monitoredCommodities: ["White Maize"],
    urgencyThreshold: "LOW",
    minConfidence: 0.5,
    notificationChannels: ["IN_APP"],
    digestFrequency: "DAILY",
    mutedRecommendationTypes: [],
  },
  decisionContext: {
    actorRole: "FARMER",
    state: "Kano",
    selectedCommodities: ["White Maize"],
    marketPressureCount: 2,
    demandSignalCount: 1,
    supplySignalCount: 1,
    procurementRiskCount: 0,
    logisticsBottleneckCount: 1,
    biosecurityAlertCount: 0,
    foodSecurityContextCount: 0,
    activeOpportunitiesCount: 3,
    contributingAgents: ["MARKET", "PRODUCTION", "DEMAND", "LOGISTICS"],
    latestGeneratedAt: new Date().toISOString(),
    signals: [
      {
        id: "sig-1",
        domain: "MARKET",
        signalType: "PRICE_SURGE",
        severity: "HIGH",
        commodity: "White Maize",
        state: "Kano",
        summary: "Wholesale price surge in Dawanau market.",
        confidence: 0.88,
      },
    ],
  },
  recommendations: [mockRecommendation],
  marketSignals: [
    {
      id: "mkt-1",
      commodity: "White Maize",
      state: "Kano",
      pressureType: "WHOLESALE PRICE SURGE",
      trend: "HIGH_PRESSURE",
      confidence: 0.88,
      severity: "HIGH",
      updatedAt: new Date().toISOString(),
    },
  ],
  supplyAndDemand: {
    supplyGaps: [
      {
        commodity: "White Maize",
        state: "Kano",
        shortageLevel: "HIGH",
        confidence: 0.85,
        actionUrl: "/marketplace",
      },
    ],
    demandPeaks: [
      {
        commodity: "White Maize",
        volumeEstimate: "Commercial Bulk Volume",
        timing: "Next 14 Days",
        confidence: 0.9,
      },
    ],
  },
  procurementOpportunities: [
    {
      id: "proc-1",
      title: "Bulk Maize Supply Window",
      commodity: "White Maize",
      volume: "50 Metric Tonnes",
      urgency: "HIGH",
      actionUrl: "/procurement-intelligence",
    },
  ],
  logisticsAlerts: [
    {
      id: "log-1",
      corridor: "Kano - Kaduna Transit Corridor",
      status: "Moderate Delay",
      severity: "MEDIUM",
      summary: "Road works near Zaria.",
      actionUrl: "/logistics-intelligence",
    },
  ],
  biosecurityAdvisories: [
    {
      id: "bio-1",
      threatName: "Fall Armyworm Monitoring",
      affectedSpecies: "White Maize",
      state: "Kano",
      advisoryType: "Field Inspection Notice",
      urgency: "MEDIUM",
      actionUrl: "/disease-intelligence",
    },
  ],
  opportunities: [
    {
      id: "opp-1",
      title: "Grain Aggregation Initiative",
      category: "AGGREGATION",
      summary: "Combine freight to reduce transportation overhead.",
      actionUrl: "/marketplace",
      actionLabel: "Explore Aggregation",
    },
  ],
  notifications: [
    {
      id: "notif-1",
      userId: "test-user-id",
      type: "MARKET_SIGNAL",
      channel: "IN_APP",
      title: "Grain price surge reported in Dawanau",
      body: "Wholesale prices increased by 14% over baseline.",
      isRead: false,
      severity: "HIGH",
      createdAt: new Date().toISOString(),
    },
  ],
  decisions: [],
  actions: [],
  outcomes: [],
};

describe("Phase 3.2: Agricultural Decision & Action Intelligence UI Components", () => {
  it("renders the main dashboard with role hero, metrics, and navigation tabs", () => {
    render(<MyIntelligenceDashboard initialData={mockDashboardData} />);

    expect(screen.getByText(/Actionable Intelligence for Farmers/i)).toBeDefined();
    expect(screen.getAllByText(/Favorable Wholesale Maize Off-Take Window in Kano/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pending Recommendations/i)).toBeDefined();
    expect(screen.getByText(/1. Overview/i)).toBeDefined();
    expect(screen.getByText(/3. Recommendations/i)).toBeDefined();
  });

  it("switches tabs across different decision intelligence domains", () => {
    render(<MyIntelligenceDashboard initialData={mockDashboardData} />);

    // Switch to Market Signals tab
    const marketTab = screen.getByText(/4. Market Signals/i);
    fireEvent.click(marketTab);
    expect(screen.getByText(/Regional Market Signals/i)).toBeDefined();
    expect(screen.getByText(/WHOLESALE PRICE SURGE/i)).toBeDefined();

    // Switch to Supply & Demand tab
    const supplyTab = screen.getByText(/5. Supply & Demand/i);
    fireEvent.click(supplyTab);
    expect(screen.getByText(/Observed Supply Gaps/i)).toBeDefined();
    expect(screen.getByText(/Demand Projections/i)).toBeDefined();

    // Switch to Health & Biosecurity tab
    const bioTab = screen.getByText(/8. Health & Biosecurity/i);
    fireEvent.click(bioTab);
    expect(screen.getByText(/Fall Armyworm Monitoring/i)).toBeDefined();

    // Switch to Why Am I Seeing This tab
    const explainTab = screen.getByText(/13. Why Am I Seeing This\?/i);
    fireEvent.click(explainTab);
    expect(screen.getByText(/Your Active Personalization Profile/i)).toBeDefined();
    expect(screen.getByText(/Strict Commercial Privacy/i)).toBeDefined();
  });

  it("renders DecisionDialog and displays all 8 decision choices", () => {
    const handleClose = vi.fn();
    render(
      <DecisionDialog
        recommendation={mockRecommendation}
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Record Decision: Favorable Wholesale Maize/i)).toBeDefined();
    expect(screen.getByText(/Accept Recommendation/i)).toBeDefined();
    expect(screen.getByText(/Save for Later/i)).toBeDefined();
    expect(screen.getByText(/Defer Decision/i)).toBeDefined();
    expect(screen.getByText(/Request More Details/i)).toBeDefined();
    expect(screen.getByText(/Seek Agronomic Expert/i)).toBeDefined();
    expect(screen.getByText(/Taking External Action/i)).toBeDefined();
    expect(screen.getByText(/Dismiss Advisory/i)).toBeDefined();
    expect(screen.getByText(/Reject Recommendation/i)).toBeDefined();
  });

  it("renders ExplainabilityModal with all 8 core decision breakdown questions", () => {
    const handleClose = vi.fn();
    render(
      <ExplainabilityModal
        recommendation={mockRecommendation}
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Why Am I Seeing This\?/i)).toBeDefined();
    expect(screen.getByText(/1. What is happening\?/i)).toBeDefined();
    expect(screen.getByText(/2. Why does it matter\?/i)).toBeDefined();
    expect(screen.getByText(/3. Who does it affect\?/i)).toBeDefined();
    expect(screen.getByText(/4. Where\?/i)).toBeDefined();
    expect(screen.getByText(/5. What evidence supports it\?/i)).toBeDefined();
    expect(screen.getByText(/6. What could you consider doing\?/i)).toBeDefined();
    expect(screen.getByText(/7. What are the limitations\?/i)).toBeDefined();
    expect(screen.getByText(/8. What happened after you decided\?/i)).toBeDefined();
    expect(screen.getByText(/Commercial Privacy & Advisory Guarantee/i)).toBeDefined();
  });

  it("renders PreferencesDrawer and enables customizing role and territory", () => {
    const handleClose = vi.fn();
    render(
      <PreferencesDrawer
        preferences={mockDashboardData.preferences}
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Intelligence Settings/i)).toBeDefined();
    expect(screen.getByText(/Primary Role Perspective/i)).toBeDefined();
    expect(screen.getByText(/Monitored Commodities/i)).toBeDefined();
    expect(screen.getByText(/Save Preferences/i)).toBeDefined();
  });
});
