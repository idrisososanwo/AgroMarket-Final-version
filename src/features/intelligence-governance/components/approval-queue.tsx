"use client";

import React, { useState } from "react";
import { HumanApprovalRecord } from "../types";
import { ApprovalStatusBadge } from "./approval-status-badge";
import { RiskLevelBadge } from "./risk-level-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { approveHumanApprovalAction, rejectHumanApprovalAction } from "../actions";
import {
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Clock,
  Filter,
  FileCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export interface ApprovalQueueProps {
  approvals: HumanApprovalRecord[];
  currentUserRole?: string;
  onRefresh?: () => void;
}

export function ApprovalQueue({
  approvals,
  currentUserRole: _currentUserRole = "ADMIN",
  onRefresh,
}: ApprovalQueueProps) {
  const [selectedApproval, setSelectedApproval] = useState<HumanApprovalRecord | null>(
    approvals.find((a) => a.status === "PENDING") || approvals[0] || null
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionMode, setDecisionMode] = useState<"APPROVE" | "REJECT" | null>(null);
  const [justification, setJustification] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filtered = approvals.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (riskFilter !== "ALL" && (item.riskLevel || "HIGH") !== riskFilter) return false;
    if (typeFilter !== "ALL" && item.approvalType !== typeFilter) return false;
    return true;
  });

  const handleApprove = async () => {
    if (!selectedApproval) return;
    if (!justification.trim()) {
      setActionError("A substantive justification is strictly required to authorize this action.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await approveHumanApprovalAction(selectedApproval.id, justification);
      if (!res.success) {
        setActionError(res.error || "Approval rejected by server policy re-evaluation.");
      } else {
        setActionSuccess("Approval granted and audited successfully under server governance policy.");
        setDecisionMode(null);
        setJustification("");
        if (res.data) {
          setSelectedApproval(res.data);
        }
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unexpected error while approving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    if (!justification.trim()) {
      setActionError("A rejection reason is strictly required for compliance records.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await rejectHumanApprovalAction(selectedApproval.id, justification);
      if (!res.success) {
        setActionError(res.error || "Failed to reject approval request.");
      } else {
        setActionSuccess("Action rejected and archived in governance audit ledger.");
        setDecisionMode(null);
        setJustification("");
        if (res.data) {
          setSelectedApproval(res.data);
        }
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unexpected error while rejecting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (approvals.length === 0) {
    return (
      <EmptyState
        title="No approval records found"
        description="There are currently no human, professional, or authority review items recorded in the governance ledger."
        icon={<FileCheck className="h-6 w-6 text-neutral-400" />}
      />
    );
  }

  const isExpired = selectedApproval
    ? new Date(selectedApproval.expiresAt) <= new Date()
    : false;

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter Approvals ({filtered.length} of {approvals.length})</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Filter by approval status"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Action</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
            <option value="SUPERSEDED">Superseded</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Filter by risk level"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MODERATE">Moderate</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Filter by approval type"
          >
            <option value="ALL">All Review Types</option>
            <option value="OPERATOR_CONFIRMATION">Operator Confirmation</option>
            <option value="PROFESSIONAL_REVIEW">Professional Review</option>
            <option value="AUTHORITY_REVIEW">Authority Review</option>
            <option value="PLATFORM_REVIEW">Platform Review</option>
          </select>

          {(statusFilter !== "ALL" || riskFilter !== "ALL" || typeFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setRiskFilter("ALL");
                setTypeFilter("ALL");
              }}
              className="text-xs h-8"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Queue and Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List */}
        <div className="lg:col-span-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-white">
              <p className="text-sm text-neutral-500">No review requests match your selected filters.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedApproval?.id === item.id;
              const itemExpired = new Date(item.expiresAt) <= new Date();

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedApproval(item);
                    setDecisionMode(null);
                    setActionError(null);
                    setActionSuccess(null);
                    setJustification("");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-[#0F4327] bg-[#F4F9F5] shadow-xs"
                      : "border-[#E5E0D5] bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <ApprovalStatusBadge status={item.status} size="sm" />
                    <RiskLevelBadge level={item.riskLevel || "HIGH"} size="sm" />
                  </div>

                  <div className="text-xs font-bold text-neutral-900 line-clamp-1 mb-1">
                    {item.actionIntent}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-medium text-neutral-700">
                      {item.approvalType.replace("_", " ")}
                    </span>
                    <span className={itemExpired ? "text-amber-600 font-semibold" : ""}>
                      {itemExpired ? "Expired" : `Exp: ${new Date(item.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Review Details & Decision Controls */}
        <div className="lg:col-span-7">
          {selectedApproval ? (
            <Card className="border-[#E5E0D5] shadow-sm">
              <CardHeader className="border-b border-[#E5E0D5] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <ApprovalStatusBadge status={selectedApproval.status} size="md" />
                    <RiskLevelBadge level={selectedApproval.riskLevel || "HIGH"} size="md" />
                  </div>
                  <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
                    Policy: {selectedApproval.policyVersion}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-neutral-900">
                  {selectedApproval.actionIntent}
                </CardTitle>
                <p className="text-xs text-neutral-500 mt-1">
                  Required Role: <strong className="text-neutral-700">{selectedApproval.approverRole}</strong> • Review Type:{" "}
                  <strong>{selectedApproval.approvalType.replace("_", " ")}</strong>
                </p>
              </CardHeader>

              <CardContent className="space-y-6 pt-5">
                {/* Status Banners */}
                {actionError && (
                  <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
                )}
                {actionSuccess && (
                  <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Safety & Compliance Constraints Disclaimer */}
                {selectedApproval.approvalType === "PROFESSIONAL_REVIEW" && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Professional Oversight Protocol:</strong>
                      This review pertains strictly to agronomic and biosecurity observational risk screening. AgroMarket does not provide veterinary diagnosis or chemical prescription instructions.
                    </div>
                  </div>
                )}

                {selectedApproval.approvalType === "AUTHORITY_REVIEW" && (
                  <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/60 text-xs text-red-900 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Statutory Authority Review Protocol:</strong>
                      AgroMarket does not possess statutory or police authority. Review requires external regulatory documentation or official state coordinator sanction.
                    </div>
                  </div>
                )}

                {/* Metadata Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Created</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5">
                      {new Date(selectedApproval.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Expires</div>
                    <div className={`text-xs font-semibold mt-0.5 ${isExpired ? "text-amber-600 font-bold" : "text-neutral-900"}`}>
                      {new Date(selectedApproval.expiresAt).toLocaleString()}
                      {isExpired && " (EXPIRED)"}
                    </div>
                  </div>
                </div>

                {/* Justification or History */}
                {selectedApproval.justification && (
                  <div className="p-3.5 rounded-lg border border-[#E5E0D5] bg-white">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Recorded Justification
                    </div>
                    <p className="text-xs text-neutral-800 leading-relaxed font-sans">
                      {selectedApproval.justification}
                    </p>
                  </div>
                )}

                {selectedApproval.revocationReason && (
                  <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/30">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1">
                      Rejection / Revocation Reason
                    </div>
                    <p className="text-xs text-red-900 leading-relaxed">
                      {selectedApproval.revocationReason}
                    </p>
                  </div>
                )}

                {/* Action Decision Form (Only for Pending and Non-Expired) */}
                {selectedApproval.status === "PENDING" && !isExpired && (
                  <div className="pt-2 border-t border-[#E5E0D5] space-y-4">
                    <div className="text-xs font-bold text-neutral-800">Reviewer Decision Action</div>

                    {decisionMode === null ? (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="primary"
                          onClick={() => setDecisionMode("APPROVE")}
                          className="flex-1 bg-[#0F4327] hover:bg-[#14532D] text-white text-xs h-9"
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Grant Approval
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDecisionMode("REJECT")}
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50 text-xs h-9"
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Reject Action
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900">
                            {decisionMode === "APPROVE" ? "Authorize Action Execution" : "Reject Action Request"}
                          </span>
                          <button
                            onClick={() => {
                              setDecisionMode(null);
                              setActionError(null);
                            }}
                            className="text-xs text-neutral-500 hover:text-neutral-700"
                          >
                            Cancel
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                            {decisionMode === "APPROVE"
                              ? "Affirmative Justification (Required for Audit Ledger):"
                              : "Reason for Rejection (Required for Compliance Ledger):"}
                          </label>
                          <textarea
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder={
                              decisionMode === "APPROVE"
                                ? "Detail why this action is authorized and consistent with operational and safety policy..."
                                : "Detail the policy infraction, safety risk, or evidence deficit..."
                            }
                            rows={3}
                            className="w-full rounded-lg border border-[#E5E0D5] bg-white p-2.5 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDecisionMode(null)}
                            disabled={isSubmitting}
                            className="text-xs h-8"
                          >
                            Back
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={decisionMode === "APPROVE" ? handleApprove : handleReject}
                            disabled={isSubmitting}
                            className={`text-xs h-8 ${
                              decisionMode === "APPROVE"
                                ? "bg-[#0F4327] hover:bg-[#14532D] text-white"
                                : "bg-red-700 hover:bg-red-800 text-white"
                            }`}
                          >
                            {isSubmitting ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : decisionMode === "APPROVE" ? (
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                            ) : (
                              <X className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Confirm {decisionMode === "APPROVE" ? "Approval" : "Rejection"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isExpired && selectedApproval.status === "PENDING" && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start gap-2">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Approval Window Expired:</strong> This request has exceeded its maximum permitted TTL ({selectedApproval.expiresAt}). To ensure safety and policy consistency, stale approvals cannot be authorized. A fresh evaluation must be generated.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-[#FBF9F4]">
              <p className="text-sm text-neutral-500">Select an item from the approval queue to review and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
