"use client";

import React, { useState } from "react";
import {
  CoordinationOpportunity,
  SupplyCommitment,
  CommitmentEvidence,
  CommitmentReadinessStatus,
  CommitmentFailureReason,
  EvidenceCategory,
  EvidenceProvenance,
} from "../types";
import { ReadinessStatusBadge } from "./readiness-status-badge";
import { ReconciliationStatusBadge } from "./reconciliation-status-badge";
import {
  calculateCoordinationShortfall,
  reconcileCommitmentQuantity,
} from "../calculations";
import {
  confirmCommitmentQuantityAction,
  updateFulfilmentReadinessAction,
  recordCommitmentFulfilmentAction,
  recordCommitmentFailureAction,
  submitFulfilmentEvidenceAction,
} from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  TrendingDown,
  Loader2,
  FileCheck,
  Send,
  AlertOctagon,
} from "lucide-react";

interface FulfilmentReconciliationPanelProps {
  opportunity: CoordinationOpportunity;
  commitments: SupplyCommitment[];
  evidenceList?: CommitmentEvidence[];
  currentUserId?: string | null;
  currentUserRole?: string | null;
  onCommitmentUpdated?: (updated: SupplyCommitment) => void;
  onEvidenceAdded?: (evidence: CommitmentEvidence) => void;
}

export function FulfilmentReconciliationPanel({
  opportunity,
  commitments,
  evidenceList = [],
  currentUserId,
  currentUserRole,
  onCommitmentUpdated,
  onEvidenceAdded,
}: FulfilmentReconciliationPanelProps) {
  const [activeCommitmentId, setActiveCommitmentId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<
    "CONFIRM_QTY" | "READINESS" | "RECORD_FULFILMENT" | "RECORD_FAILURE" | "SUBMIT_EVIDENCE" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states
  const [confirmedQty, setConfirmedQty] = useState<number | "">("");
  const [readinessStatus, setReadinessStatus] = useState<CommitmentReadinessStatus>("READY_FOR_LOGISTICS");
  const [fulfilledQty, setFulfilledQty] = useState<number | "">("");
  const [evidenceCategory, setEvidenceCategory] = useState<EvidenceCategory>("DELIVERY_CONFIRMATION");
  const [provenance, setProvenance] = useState<EvidenceProvenance>("TRANSACTION_OBSERVED");
  const [failureReason, setFailureReason] = useState<CommitmentFailureReason>("QUANTITY_SHORTFALL");
  const [actionNotes, setActionNotes] = useState("");

  const shortfall = calculateCoordinationShortfall({
    opportunityId: opportunity.id,
    requiredQuantity: opportunity.requiredQuantity,
    fulfilledQuantity: opportunity.fulfilledQuantity,
    unit: opportunity.unit,
  });

  const isCoordinator = Boolean(
    currentUserId &&
      (opportunity.creatorId === currentUserId || currentUserRole === "ADMIN")
  );

  const resetForm = () => {
    setActiveCommitmentId(null);
    setActionType(null);
    setActionError(null);
    setActionSuccess(null);
    setConfirmedQty("");
    setFulfilledQty("");
    setActionNotes("");
  };

  const handleConfirmQuantity = async (commitment: SupplyCommitment) => {
    if (!confirmedQty || Number(confirmedQty) <= 0) {
      setActionError("Please enter a valid quantity greater than 0.");
      return;
    }
    setLoading(true);
    setActionError(null);

    const res = await confirmCommitmentQuantityAction({
      commitmentId: commitment.id,
      confirmedQuantity: Number(confirmedQty),
      notes: actionNotes || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setActionError(res.error || "Failed to confirm quantity.");
      return;
    }

    setActionSuccess(`Quantity of ${confirmedQty} ${commitment.unit} confirmed successfully.`);
    if (res.data && onCommitmentUpdated) {
      onCommitmentUpdated(res.data);
    }
    setTimeout(resetForm, 1500);
  };

  const handleUpdateReadiness = async (commitment: SupplyCommitment) => {
    setLoading(true);
    setActionError(null);

    const res = await updateFulfilmentReadinessAction({
      commitmentId: commitment.id,
      readinessStatus,
      notes: actionNotes || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setActionError(res.error || "Failed to update readiness status.");
      return;
    }

    setActionSuccess(`Readiness updated to ${readinessStatus}.`);
    if (res.data && onCommitmentUpdated) {
      onCommitmentUpdated(res.data);
    }
    setTimeout(resetForm, 1500);
  };

  const handleRecordFulfilment = async (commitment: SupplyCommitment) => {
    if (fulfilledQty === "" || Number(fulfilledQty) < 0) {
      setActionError("Please enter a valid non-negative fulfilled quantity.");
      return;
    }
    setLoading(true);
    setActionError(null);

    const res = await recordCommitmentFulfilmentAction({
      commitmentId: commitment.id,
      fulfilledQuantity: Number(fulfilledQty),
      unit: commitment.unit,
      evidenceCategory,
      provenance,
      notes: actionNotes || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setActionError(res.error || "Failed to record fulfilment.");
      return;
    }

    setActionSuccess(`Recorded ${fulfilledQty} ${commitment.unit} fulfilment successfully.`);
    if (res.data?.commitment && onCommitmentUpdated) {
      onCommitmentUpdated(res.data.commitment);
    }
    setTimeout(resetForm, 1500);
  };

  const handleRecordFailure = async (commitment: SupplyCommitment) => {
    if (!actionNotes || actionNotes.trim().length < 3) {
      setActionError("Please provide an explanatory note for the failure.");
      return;
    }
    setLoading(true);
    setActionError(null);

    const res = await recordCommitmentFailureAction({
      commitmentId: commitment.id,
      failureReason,
      notes: actionNotes,
    });

    setLoading(false);
    if (!res.success) {
      setActionError(res.error || "Failed to record commitment failure.");
      return;
    }

    setActionSuccess("Failure recorded and reconciliation updated.");
    if (res.data && onCommitmentUpdated) {
      onCommitmentUpdated(res.data);
    }
    setTimeout(resetForm, 1500);
  };

  const handleSubmitEvidence = async (commitment: SupplyCommitment) => {
    setLoading(true);
    setActionError(null);

    const res = await submitFulfilmentEvidenceAction({
      commitmentId: commitment.id,
      evidenceCategory,
      provenance,
      quantityObserved: fulfilledQty !== "" ? Number(fulfilledQty) : undefined,
      unit: commitment.unit,
      notes: actionNotes || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setActionError(res.error || "Failed to submit evidence.");
      return;
    }

    setActionSuccess("Fulfilment evidence recorded successfully.");
    if (res.data && onEvidenceAdded) {
      onEvidenceAdded(res.data);
    }
    setTimeout(resetForm, 1500);
  };

  const acceptedOrFulfilledCommitments = commitments.filter((c) =>
    ["ACCEPTED", "CONFIRMED", "FULFILMENT_PENDING", "FULFILLED", "FAILED"].includes(
      c.status
    )
  );

  return (
    <div className="space-y-6">
      {/* 1. Coordination Shortfall Alert */}
      {shortfall.hasShortfall ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 mt-0.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Supply Shortfall: {shortfall.shortfallQuantity.toLocaleString()} {shortfall.unit} Remaining
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Observed physical fulfilment is currently {opportunity.fulfilledQuantity.toLocaleString()} /{" "}
                {opportunity.requiredQuantity.toLocaleString()} {opportunity.unit}. Shortfall is advisory; no autonomous procurement is executed.
              </p>
            </div>
          </div>
          <Badge
            variant="warning"
            className="border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/40 shrink-0"
          >
            Shortfall Active
          </Badge>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Zero Shortfall — Demand Fully Reconciled
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                All {opportunity.requiredQuantity.toLocaleString()} {opportunity.unit} required have been observed and fulfilled.
              </p>
            </div>
          </div>
          <Badge
            variant="success"
            className="border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/40"
          >
            Fulfilment Complete
          </Badge>
        </div>
      )}

      {/* 2. Commitment Fulfilment & Reconciliation Records */}
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Commitment Fulfilment & Reconciliation Ledger
            </span>
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              {acceptedOrFulfilledCommitments.length} Active Fulfilment Track(s)
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {acceptedOrFulfilledCommitments.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <PackageCheck className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm">No supply commitments accepted for fulfilment yet.</p>
              <p className="text-xs mt-1">Accept offers to begin tracking fulfilment readiness and reconciliation.</p>
            </div>
          ) : (
            acceptedOrFulfilledCommitments.map((commitment) => {
              const rec = reconcileCommitmentQuantity({
                commitmentId: commitment.id,
                committedQuantity: commitment.committedQuantity,
                confirmedQuantity: commitment.confirmedQuantity,
                fulfilledQuantity: commitment.fulfilledQuantity,
                unit: commitment.unit,
              });

              const isOwner = currentUserId === commitment.participantId;
              const canMutate = isOwner || isCoordinator;
              const commitmentEvidence = evidenceList.filter(
                (e) => e.commitmentId === commitment.id
              );

              return (
                <div
                  key={commitment.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {commitment.participantDisplayName || "Producer"}
                        </span>
                        <span className="text-xs text-zinc-400">
                          ({commitment.locationState}, {commitment.locationLga})
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Committed: {commitment.committedQuantity.toLocaleString()} {commitment.unit} ({commitment.qualityGrade})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <ReadinessStatusBadge status={commitment.readinessStatus} />
                      <ReconciliationStatusBadge status={rec.outcome} />
                      {commitment.disputeId && (
                        <Badge variant="danger" className="border-rose-400 text-rose-700 bg-rose-50 text-xs">
                          Disputed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Quantity Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Committed</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                        {commitment.committedQuantity.toLocaleString()} {commitment.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Confirmed Ready</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                        {commitment.confirmedQuantity != null
                          ? `${commitment.confirmedQuantity.toLocaleString()} ${commitment.unit}`
                          : "Unconfirmed"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Fulfilled</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                        {commitment.fulfilledQuantity.toLocaleString()} {commitment.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Remaining</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
                        {commitment.remainingQuantity.toLocaleString()} {commitment.unit}
                      </span>
                    </div>
                  </div>

                  {/* Variance Information */}
                  {rec.varianceQuantity !== 0 && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Quantity variance: <strong>{rec.varianceQuantity > 0 ? `+${rec.varianceQuantity}` : rec.varianceQuantity} {commitment.unit}</strong> ({rec.variancePercentage}%)
                      </span>
                      {commitment.failureReason && (
                        <span className="text-rose-600 dark:text-rose-400">
                          Reason: {commitment.failureReason.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  {canMutate && commitment.status !== "CANCELLED" && commitment.status !== "FAILED" && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      {isOwner && commitment.confirmedQuantity == null && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveCommitmentId(commitment.id);
                            setActionType("CONFIRM_QTY");
                            setConfirmedQty(commitment.committedQuantity);
                          }}
                          className="text-xs h-8"
                        >
                          Confirm Quantity
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveCommitmentId(commitment.id);
                          setActionType("READINESS");
                          setReadinessStatus(commitment.readinessStatus);
                        }}
                        className="text-xs h-8"
                      >
                        Update Readiness
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveCommitmentId(commitment.id);
                          setActionType("RECORD_FULFILMENT");
                          setFulfilledQty(commitment.remainingQuantity);
                        }}
                        className="text-xs h-8 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        Record Fulfilment
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveCommitmentId(commitment.id);
                          setActionType("SUBMIT_EVIDENCE");
                        }}
                        className="text-xs h-8"
                      >
                        <FileCheck className="w-3.5 h-3.5 mr-1" />
                        Attach Evidence
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveCommitmentId(commitment.id);
                          setActionType("RECORD_FAILURE");
                        }}
                        className="text-xs h-8 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                        Record Shortfall/Failure
                      </Button>
                    </div>
                  )}

                  {/* Active Action Form */}
                  {activeCommitmentId === commitment.id && actionType && (
                    <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 mt-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {actionType === "CONFIRM_QTY" && "Confirm Supply Quantity"}
                          {actionType === "READINESS" && "Update Fulfilment Readiness"}
                          {actionType === "RECORD_FULFILMENT" && "Record Physical Fulfilment"}
                          {actionType === "RECORD_FAILURE" && "Record Shortfall or Failure"}
                          {actionType === "SUBMIT_EVIDENCE" && "Submit Fulfilment Evidence"}
                        </span>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          Cancel
                        </button>
                      </div>

                      {actionError && (
                        <div className="text-xs p-2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          {actionError}
                        </div>
                      )}
                      {actionSuccess && (
                        <div className="text-xs p-2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {actionSuccess}
                        </div>
                      )}

                      {actionType === "CONFIRM_QTY" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Confirmed Ready Quantity ({commitment.unit})
                            </label>
                            <input
                              type="number"
                              value={confirmedQty}
                              onChange={(e) => setConfirmedQty(e.target.value === "" ? "" : Number(e.target.value))}
                              max={commitment.committedQuantity}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Notes (Optional)
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              rows={2}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                              placeholder="Batch notes or availability details..."
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleConfirmQuantity(commitment)}
                            disabled={loading}
                            className="w-full text-xs"
                          >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            Submit Quantity Confirmation
                          </Button>
                        </div>
                      )}

                      {actionType === "READINESS" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              New Readiness Status
                            </label>
                            <select
                              value={readinessStatus}
                              onChange={(e) => setReadinessStatus(e.target.value as CommitmentReadinessStatus)}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent dark:bg-zinc-900"
                            >
                              <option value="NOT_READY">Not Ready</option>
                              <option value="READY_FOR_AGGREGATION">Ready for Aggregation</option>
                              <option value="READY_FOR_PROCESSING">Ready for Processing</option>
                              <option value="READY_FOR_LOGISTICS">Ready for Logistics</option>
                              <option value="IN_FULFILMENT">In Fulfilment</option>
                              <option value="FULFILLED">Fulfilled</option>
                            </select>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateReadiness(commitment)}
                            disabled={loading}
                            className="w-full text-xs"
                          >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            Update Status
                          </Button>
                        </div>
                      )}

                      {actionType === "RECORD_FULFILMENT" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                                Quantity Fulfilled ({commitment.unit})
                              </label>
                              <input
                                type="number"
                                value={fulfilledQty}
                                onChange={(e) => setFulfilledQty(e.target.value === "" ? "" : Number(e.target.value))}
                                max={commitment.committedQuantity}
                                className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                                Evidence Category
                              </label>
                              <select
                                value={evidenceCategory}
                                onChange={(e) => setEvidenceCategory(e.target.value as EvidenceCategory)}
                                className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent dark:bg-zinc-900"
                              >
                                <option value="DELIVERY_CONFIRMATION">Delivery Confirmation</option>
                                <option value="LOGISTICS_HANDOFF">Logistics Handoff</option>
                                <option value="AGGREGATION_CONFIRMATION">Aggregation Confirmation</option>
                                <option value="PROCESSING_CONFIRMATION">Processing Confirmation</option>
                                <option value="QUANTITY_CONFIRMATION">Quantity Confirmation</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Verification Provenance
                            </label>
                            <select
                              value={provenance}
                              onChange={(e) => setProvenance(e.target.value as EvidenceProvenance)}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent dark:bg-zinc-900"
                            >
                              <option value="TRANSACTION_OBSERVED">Transaction Observed</option>
                              <option value="AUTHORIZED_REVIEW">Authorized Review</option>
                              <option value="SYSTEM_DERIVED">System Derived</option>
                              <option value="SELF_REPORTED">Self Reported</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Fulfilment Notes
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              rows={2}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                              placeholder="Waybill reference, scale weight ticket, receipt info..."
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRecordFulfilment(commitment)}
                            disabled={loading}
                            className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            Commit Fulfilment & Reconcile
                          </Button>
                        </div>
                      )}

                      {actionType === "RECORD_FAILURE" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Failure / Shortfall Reason
                            </label>
                            <select
                              value={failureReason}
                              onChange={(e) => setFailureReason(e.target.value as CommitmentFailureReason)}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent dark:bg-zinc-900"
                            >
                              <option value="QUANTITY_SHORTFALL">Quantity Shortfall</option>
                              <option value="SUPPLY_UNAVAILABLE">Supply Unavailable</option>
                              <option value="TIMING_FAILURE">Timing Failure</option>
                              <option value="LOGISTICS_CONSTRAINT">Logistics Constraint</option>
                              <option value="PROCESSING_CONSTRAINT">Processing Constraint</option>
                              <option value="QUALITY_REQUIREMENT_UNMET">Quality Requirement Unmet</option>
                              <option value="SECURITY_DISRUPTION">Security Disruption</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Explanation & Evidence (Required)
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              rows={2}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                              placeholder="Detail the root cause and circumstances..."
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRecordFailure(commitment)}
                            disabled={loading}
                            className="w-full text-xs bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            Confirm Failure Record
                          </Button>
                        </div>
                      )}

                      {actionType === "SUBMIT_EVIDENCE" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                                Category
                              </label>
                              <select
                                value={evidenceCategory}
                                onChange={(e) => setEvidenceCategory(e.target.value as EvidenceCategory)}
                                className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent dark:bg-zinc-900"
                              >
                                <option value="DELIVERY_CONFIRMATION">Delivery Confirmation</option>
                                <option value="LOGISTICS_HANDOFF">Logistics Handoff</option>
                                <option value="AGGREGATION_CONFIRMATION">Aggregation Confirmation</option>
                                <option value="PROCESSING_CONFIRMATION">Processing Confirmation</option>
                                <option value="AVAILABILITY_CONFIRMATION">Availability Confirmation</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                                Provenance
                              </label>
                              <select
                                value={provenance}
                                onChange={(e) => setProvenance(e.target.value as EvidenceProvenance)}
                                className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent dark:bg-zinc-900"
                              >
                                <option value="SELF_REPORTED">Self Reported</option>
                                <option value="TRANSACTION_OBSERVED">Transaction Observed</option>
                                <option value="AUTHORIZED_REVIEW">Authorized Review</option>
                                <option value="EXTERNAL_SOURCE">External Source</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Observed Quantity (Optional)
                            </label>
                            <input
                              type="number"
                              value={fulfilledQty}
                              onChange={(e) => setFulfilledQty(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                              Evidence Notes & Documentation
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              rows={2}
                              className="w-full text-xs rounded border border-zinc-300 dark:border-zinc-700 p-2 bg-transparent"
                              placeholder="Inspection observations, vehicle plates, warehouse receipt number..."
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitEvidence(commitment)}
                            disabled={loading}
                            className="w-full text-xs"
                          >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Submit Evidence
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evidence Timeline */}
                  {commitmentEvidence.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-medium text-zinc-500 block mb-2">
                        Recorded Evidence ({commitmentEvidence.length})
                      </span>
                      <div className="space-y-1.5">
                        {commitmentEvidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs"
                          >
                            <div>
                              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                {ev.evidenceCategory.replace(/_/g, " ")}
                              </span>
                              {ev.quantityObserved != null && (
                                <span className="text-zinc-500 ml-1">
                                  ({ev.quantityObserved} {ev.unit})
                                </span>
                              )}
                              {ev.notes && (
                                <p className="text-zinc-400 text-[11px] mt-0.5">{ev.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="neutral" className="text-[10px] py-0">
                                {ev.provenance}
                              </Badge>
                              <span className="text-[10px] text-zinc-400">
                                {new Date(ev.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
