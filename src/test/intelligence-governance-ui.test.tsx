// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import {
  GovernanceStatusBadge,
  RiskLevelBadge,
  ApprovalStatusBadge,
  EvaluationsList,
  ApprovalQueue,
  AgentCapabilitiesView,
  PolicyViewer,
  OverridesView,
  AuditTrailView,
  GovernanceCommandCenter,
} from "@/features/intelligence-governance";

import {
  GovernanceEvaluationResult,
  HumanApprovalRecord,
  GovernanceOverrideRecord,
  GovernanceSummaryStats,
} from "@/features/intelligence-governance/types";
import { GovernanceAuditEntry } from "@/features/intelligence-governance/audit";
import {
  approveHumanApprovalAction,
} from "@/features/intelligence-governance/actions";
import { ActionIntegrationButton } from "@/features/action-integration/components/action-integration-button";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock server actions for approvals
vi.mock("@/features/intelligence-governance/actions", () => ({
  approveHumanApprovalAction: vi.fn(),
  rejectHumanApprovalAction: vi.fn(),
  evaluateGovernanceAction: vi.fn(),
  submitHumanApprovalAction: vi.fn(),
  revokeHumanApprovalAction: vi.fn(),
  submitGovernanceOverrideAction: vi.fn(),
}));

// Mock action-integration actions
vi.mock("@/features/action-integration/actions", () => ({
  createActionIntegrationAction: vi.fn(),
  revalidateActionDestinationAction: vi.fn().mockResolvedValue({
    success: true,
    data: { status: "VALID", isAvailable: true, message: "Valid" },
  }),
  checkActionGovernanceGateAction: vi.fn(),
}));

// Mock auth server
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  requireAnyRole: vi.fn(),
}));

describe("Phase 3.9: Governance Presentation & Administrative Review Infrastructure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleEvaluation: GovernanceEvaluationResult = {
    id: "eval-001",
    recommendationId: "rec-001",
    scenarioId: "scen-001",
    agentId: "MARKET_INTELLIGENCE_AGENT",
    domain: "MARKET",
    actionIntent: "VIEW_PRICE_ARBITRAGE_MAIZE",
    actorRole: "BUYER",
    riskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    decision: "ALLOW",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    reasons: ["Action conforms to market monitoring scope", "Confidence score 0.85"],
    policyVersion: "v1.0.0",
    isProhibitedAction: false,
    evidenceCount: 3,
    confidenceScore: 0.85,
    contextMetadata: { commodity: "maize" },
    evaluatedAt: "2026-10-08T10:00:00Z",
  };

  const samplePendingApproval: HumanApprovalRecord & { riskLevel?: string } = {
    id: "appr-001",
    evaluationId: "eval-001",
    recommendationId: "rec-002",
    actionIntent: "BULK_PROCUREMENT_ALLOCATION",
    approverId: "user-approver-001",
    approvalType: "PLATFORM_REVIEW",
    approverRole: "ADMIN",
    riskLevel: "HIGH",
    status: "PENDING",
    justification: "",
    evidenceReferences: ["sig-1", "sig-2"],
    revocationReason: null,
    policyVersion: "v1.0.0",
    metadata: { commodity: "cassava" },
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleExpiredApproval: HumanApprovalRecord & { riskLevel?: string } = {
    id: "appr-expired",
    evaluationId: "eval-002",
    recommendationId: "rec-003",
    actionIntent: "EXPIRED_INTERVENTION_REVIEW",
    approverId: "user-approver-001",
    approvalType: "PLATFORM_REVIEW",
    approverRole: "ADMIN",
    riskLevel: "HIGH",
    status: "PENDING",
    justification: "",
    evidenceReferences: ["sig-1"],
    revocationReason: null,
    policyVersion: "v1.0.0",
    metadata: { commodity: "sorghum" },
    expiresAt: "2026-01-01T00:00:00Z",
    createdAt: "2025-12-30T00:00:00Z",
    updatedAt: "2025-12-30T00:00:00Z",
  };

  const sampleProfessionalApproval: HumanApprovalRecord & { riskLevel?: string } = {
    id: "appr-pro",
    evaluationId: "eval-003",
    recommendationId: "rec-004",
    actionIntent: "MAIZE_STEM_BORER_CONTAINMENT",
    approverId: "user-pro-001",
    approvalType: "PROFESSIONAL_REVIEW",
    approverRole: "EXPERT",
    riskLevel: "CRITICAL",
    status: "PENDING",
    justification: "",
    evidenceReferences: ["sig-3"],
    revocationReason: null,
    policyVersion: "v1.0.0",
    metadata: { commodity: "maize" },
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleAuthorityApproval: HumanApprovalRecord & { riskLevel?: string } = {
    id: "appr-auth",
    evaluationId: "eval-004",
    recommendationId: "rec-005",
    actionIntent: "REGIONAL_GRAIN_RESERVE_DISBURSEMENT",
    approverId: "user-auth-001",
    approvalType: "AUTHORITY_REVIEW",
    approverRole: "PLATFORM_COORDINATOR",
    riskLevel: "CRITICAL",
    status: "PENDING",
    justification: "",
    evidenceReferences: ["sig-4"],
    revocationReason: null,
    policyVersion: "v1.0.0",
    metadata: { commodity: "sorghum" },
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleOverride: GovernanceOverrideRecord = {
    id: "ovr-001",
    evaluationId: "eval-002",
    overrideById: "admin-user-id",
    overrideRole: "ADMIN",
    originalDecision: "REQUIRE_HUMAN_APPROVAL",
    overrideDecision: "ALLOW_WITH_OVERRIDE",
    reason: "Critical regional delivery requires immediate transit clearance under operator protocol.",
    overriddenPolicyRules: ["HUMAN_APPROVAL_HIGH_RISK"],
    policyVersion: "v1.0.0",
    metadata: {},
    createdAt: "2026-10-08T09:30:00Z",
  };

  const sampleAuditEntry: GovernanceAuditEntry = {
    id: "audit-001",
    action: "GOVERNANCE_EVALUATION_ALLOW",
    resourceType: "agricultural_governance_evaluations",
    resourceId: "eval-001",
    actorId: "system-agent",
    policyVersion: "v1.0.0",
    details: { agentId: "MARKET_INTELLIGENCE_AGENT", riskLevel: "LOW" },
    timestamp: "2026-10-08T10:00:00Z",
  };

  const sampleStats: GovernanceSummaryStats = {
    totalEvaluations: 12,
    evaluationsToday: 5,
    evaluationsRequiringReview: 3,
    pendingApprovals: 2,
    professionalReviewsPending: 1,
    authorityReviewsPending: 1,
    blockedActions: 2,
    insufficientDataDecisions: 1,
    expiredApprovals: 1,
    recentOverrides: 1,
    activePolicyVersion: "v1.0.0",
  };

  // 1 & 4. Governance Status Rendering & Badges
  it("1. renders clear plain-language status badges for all 7 governance decisions", () => {
    const { rerender } = render(<GovernanceStatusBadge decision="ALLOW" />);
    expect(screen.getByText("Permitted")).toBeDefined();

    rerender(<GovernanceStatusBadge decision="ALLOW_WITH_REVIEW" />);
    expect(screen.getByText("Advisory Permitted")).toBeDefined();

    rerender(<GovernanceStatusBadge decision="REQUIRE_HUMAN_APPROVAL" />);
    expect(screen.getByText("Human Approval Required")).toBeDefined();

    rerender(<GovernanceStatusBadge decision="REQUIRE_PROFESSIONAL_REVIEW" />);
    expect(screen.getByText("Professional Review Required")).toBeDefined();

    rerender(<GovernanceStatusBadge decision="REQUIRE_AUTHORITY_REVIEW" />);
    expect(screen.getByText("Authority Review Required")).toBeDefined();

    rerender(<GovernanceStatusBadge decision="DENY" />);
    expect(screen.getByText("Policy Denied")).toBeDefined();

    rerender(<GovernanceStatusBadge decision="INSUFFICIENT_DATA" />);
    expect(screen.getByText("Insufficient Evidence")).toBeDefined();
  });

  // Risk badges
  it("renders risk badges with proper labels", () => {
    const { rerender } = render(<RiskLevelBadge level="LOW" />);
    expect(screen.getByText("Low Risk")).toBeDefined();

    rerender(<RiskLevelBadge level="MODERATE" />);
    expect(screen.getByText("Moderate Risk")).toBeDefined();

    rerender(<RiskLevelBadge level="HIGH" />);
    expect(screen.getByText("High Risk")).toBeDefined();

    rerender(<RiskLevelBadge level="CRITICAL" />);
    expect(screen.getByText("Critical Risk")).toBeDefined();
  });

  // Approval status badges
  it("renders approval status badges correctly", () => {
    const { rerender } = render(<ApprovalStatusBadge status="PENDING" />);
    expect(screen.getByText("Pending Review")).toBeDefined();

    rerender(<ApprovalStatusBadge status="APPROVED" />);
    expect(screen.getByText("Approved")).toBeDefined();

    rerender(<ApprovalStatusBadge status="REJECTED" />);
    expect(screen.getByText("Rejected")).toBeDefined();

    rerender(<ApprovalStatusBadge status="EXPIRED" />);
    expect(screen.getByText("Expired")).toBeDefined();
  });

  // 5. Approval Queue Rendering & Empty State
  it("5. renders approval queue items and filters", () => {
    render(
      <ApprovalQueue
        approvals={[samplePendingApproval, sampleExpiredApproval]}
        currentUserRole="ADMIN"
      />
    );

    expect(screen.getAllByText("BULK_PROCUREMENT_ALLOCATION").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Filter by approval status")).toBeDefined();
  });

  // 6 & 7. Approval Detail & Decision Action with Justification
  it("6 & 7. requires justification before approving and triggers server action", async () => {
    vi.mocked(approveHumanApprovalAction).mockResolvedValueOnce({
      success: true,
      data: { ...samplePendingApproval, status: "APPROVED", justification: "Verified safe." },
    });

    render(
      <ApprovalQueue
        approvals={[samplePendingApproval]}
        currentUserRole="ADMIN"
      />
    );

    // Click Grant Approval
    const grantBtn = screen.getByText("Grant Approval");
    fireEvent.click(grantBtn);

    // Try confirming without justification
    const confirmBtn = screen.getByText("Confirm Approval");
    fireEvent.click(confirmBtn);

    // Should show error about required justification
    expect(
      screen.getByText("A substantive justification is strictly required to authorize this action.")
    ).toBeDefined();

    // Type justification
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Affirmative compliance verified under policy v1.0.0." } });

    // Confirm again
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(approveHumanApprovalAction).toHaveBeenCalledWith(
        "appr-001",
        "Affirmative compliance verified under policy v1.0.0."
      );
    });
  });

  // 8 & 9. Expired Approvals Block Action
  it("8 & 9. disables actions on expired approvals and displays safety notice", () => {
    render(
      <ApprovalQueue
        approvals={[sampleExpiredApproval]}
        currentUserRole="ADMIN"
      />
    );

    expect(screen.getByText(/Approval Window Expired/)).toBeDefined();
    expect(screen.queryByText("Grant Approval")).toBeNull();
  });

  // 12. Professional Review Visibility & Disclaimer
  it("12. displays strict biosecurity disclaimer for professional reviews", () => {
    render(
      <ApprovalQueue
        approvals={[sampleProfessionalApproval]}
        currentUserRole="EXPERT"
      />
    );

    expect(screen.getByText(/Professional Oversight Protocol/)).toBeDefined();
    expect(screen.getByText(/AgroMarket does not provide veterinary diagnosis/)).toBeDefined();
  });

  // 13. Authority Review Visibility & Disclaimer
  it("13. displays statutory authority disclaimer for authority reviews", () => {
    render(
      <ApprovalQueue
        approvals={[sampleAuthorityApproval]}
        currentUserRole="PLATFORM_COORDINATOR"
      />
    );

    expect(screen.getByText(/Statutory Authority Review Protocol/)).toBeDefined();
    expect(screen.getByText(/AgroMarket does not possess statutory or police authority/)).toBeDefined();
  });

  // 14 & 15. Overrides View & Immutability
  it("14 & 15. renders immutable override ledger without edit capability", () => {
    render(<OverridesView overrides={[sampleOverride]} />);

    expect(screen.getByText(/Immutable Administrative Override Ledger/)).toBeDefined();
    expect(screen.getByText(/Append-Only Verified/)).toBeDefined();
    expect(screen.getAllByText(/Critical regional delivery requires immediate transit clearance/).length).toBeGreaterThan(0);
    // No edit buttons
    expect(screen.queryByText("Edit")).toBeNull();
  });

  // 16. Policy Version Display
  it("16. renders read-only policy configuration and version", () => {
    render(<PolicyViewer />);

    expect(screen.getByText("Codified Governance Policy Engine")).toBeDefined();
    expect(screen.getByText(/v1.0.0 ACTIVE/)).toBeDefined();
    expect(screen.getByText(/Zero Autonomous Financial Execution/)).toBeDefined();
    expect(screen.getByText(/Zero-Tolerance Anti-Pork/)).toBeDefined();
  });

  // 17. Agent Capability Matrix (9 Agents)
  it("17. displays all 9 canonical agents and limits", () => {
    render(<AgentCapabilitiesView />);

    expect(
      screen.getByText(/Canonical Agricultural Agent Capability Matrix \(9 Agents\)/)
    ).toBeDefined();
    expect(screen.getAllByText("Market Intelligence Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Production Planning Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Demand Forecasting Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Supply Matching Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Procurement Intelligence Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Food Security & Resilience Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Logistics Intelligence Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disease & Biosecurity Intelligence Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agricultural Intelligence Orchestration Agent").length).toBeGreaterThan(0);
  });

  // 18. Audit Trail Filtering & Search
  it("18. filters and searches audit trail entries", () => {
    render(<AuditTrailView entries={[sampleAuditEntry]} />);

    expect(screen.getByText("GOVERNANCE_EVALUATION_ALLOW")).toBeDefined();
    const searchInput = screen.getByLabelText("Search audit entries");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText("No audit events match your search criteria.")).toBeDefined();
  });

  // 20 & 21. Action Integration Governance Status & Block Gating
  it("20 & 21. blocks navigation and shows governance notice when action gate denies", async () => {
    const { createActionIntegrationAction } = await import("@/features/action-integration/actions");
    vi.mocked(createActionIntegrationAction).mockResolvedValueOnce({
      success: false,
      error: "Governance Policy Block: Autonomous culling orders strictly forbidden (DENY).",
    });

    render(
      <ActionIntegrationButton
        recommendationId="rec-denied"
        resolvedRoute={{
          intent: "VIEW_DISEASE_INTELLIGENCE",
          destinationType: "SECURITY",
          url: "/admin/security",
          buttonLabel: "Initiate Culling",
          guidanceText: "Not allowed",
          requiresRevalidation: false,
          contextBannerText: "Test",
        }}
      />
    );

    const button = screen.getByText("Initiate Culling");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Governance Policy Notice/)).toBeDefined();
      expect(
        screen.getByText(/Autonomous culling orders strictly forbidden/)
      ).toBeDefined();
    });
  });

  // 26 & 27. Empty States & No Fake Data
  it("26 & 27. renders honest empty states when no records exist without fabricating data", () => {
    const { rerender } = render(<ApprovalQueue approvals={[]} />);
    expect(screen.getByText("No approval records found")).toBeDefined();

    rerender(<EvaluationsList evaluations={[]} />);
    expect(screen.getByText("No governance evaluations yet")).toBeDefined();

    rerender(<OverridesView overrides={[]} />);
    expect(screen.getByText("No governance overrides recorded")).toBeDefined();

    rerender(<AuditTrailView entries={[]} />);
    expect(screen.getByText("No governance audit logs recorded yet")).toBeDefined();
  });

  // 3. Command Center Overview Dashboard
  it("renders governance command center with accurate metrics", () => {
    render(
      <GovernanceCommandCenter
        stats={sampleStats}
        approvals={[samplePendingApproval]}
        evaluations={[sampleEvaluation]}
        overrides={[sampleOverride]}
        auditEntries={[sampleAuditEntry]}
        currentUserRole="ADMIN"
      />
    );

    expect(screen.getByText("AgroMarket Intelligence Governance Command Center")).toBeDefined();
    expect(screen.getByText("Evals Today")).toBeDefined();
    expect(screen.getByText("Pending Approvals")).toBeDefined();
    expect(screen.getByText("Blocked Actions")).toBeDefined();
  });

  // Lineage Chain & Evaluation Detail
  it("renders full execution lineage chain in evaluation detail pane", () => {
    render(<EvaluationsList evaluations={[sampleEvaluation]} />);

    expect(screen.getByText("Governance Execution Lineage")).toBeDefined();
    expect(screen.getByText(/1\. Recommendation/)).toBeDefined();
    expect(screen.getByText(/2\. Governance Evaluation/)).toBeDefined();
    expect(screen.getByText(/3\. Oversight \/ Approval/)).toBeDefined();
    expect(screen.getByText(/4\. Action Gate/)).toBeDefined();
    expect(screen.getByText(/5\. Outcome/)).toBeDefined();
  });

  // Anti-Pork invariant in validation
  it("strictly enforces anti-pork invariant rejecting prohibited produce terms in governance", async () => {
    const { assertNoProhibitedProduce } = await import("@/features/intelligence-governance/validation");
    expect(() => assertNoProhibitedProduce("PORK_SAUSAGE_PRICE_WATCH", "Test")).toThrow(
      /Anti-Pork Policy Violation/
    );
    expect(() => assertNoProhibitedProduce("swine_feed_recommendation", "Test")).toThrow(
      /Anti-Pork Policy Violation/
    );
    expect(() => assertNoProhibitedProduce("cassava_flour_inventory", "Test")).not.toThrow();
  });

  // Privacy invariant
  it("strictly enforces privacy protection stripping phone numbers and GPS coordinates", async () => {
    const { assertNoPrivateInformation } = await import("@/features/intelligence-governance/validation");
    expect(() => assertNoPrivateInformation({ phone: "+2348012345678" }, "Test")).toThrow(
      /Commercial Privacy Violation/
    );
    expect(() => assertNoPrivateInformation({ coords: "6.5244, 3.3792" }, "Test")).toThrow(
      /Commercial Privacy Violation/
    );
    expect(() => assertNoPrivateInformation({ state: "Ogun", lga: "Abeokuta South" }, "Test")).not.toThrow();
  });
});

