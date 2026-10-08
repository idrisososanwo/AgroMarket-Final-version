"use client";

import React, { useState } from "react";
import {
  CoordinationOpportunity,
  CoordinationRequirement,
  CoordinationParticipant,
  SupplyCommitment,
  CoordinationEvent,
  CoordinationCoverageSummary,
} from "../types";
import { CoordinationStatusBadge } from "./coordination-status-badge";
import { CommitmentStatusBadge } from "./commitment-status-badge";
import { CoverageProgressBar } from "./coverage-progress-bar";
import { calculateCoordinationCoverage } from "../calculations";
import {
  offerSupplyCommitmentAction,
  acceptSupplyCommitmentAction,
  withdrawSupplyCommitmentAction,
  confirmSupplyCommitmentAction,
} from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  Clock,
  CheckCircle2,
  FileCheck,
  PlusCircle,
  Truck,
  Building2,
  Loader2,
} from "lucide-react";

export interface CoordinationDetailViewProps {
  opportunity: CoordinationOpportunity;
  requirements: CoordinationRequirement[];
  participants: CoordinationParticipant[];
  commitments: SupplyCommitment[];
  events: CoordinationEvent[];
  currentUserId?: string | null;
  currentUserRole?: string | null;
}

export function CoordinationDetailView({
  opportunity,
  requirements,
  participants: _participants,
  commitments: initialCommitments,
  events: initialEvents,
  currentUserId,
  currentUserRole: _currentUserRole,
}: CoordinationDetailViewProps) {
  const [commitments, setCommitments] = useState(initialCommitments);
  const [events] = useState(initialEvents);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);

  // Offer Form State
  const [offerQuantity, setOfferQuantity] = useState<number | "">("");
  const [offerUnit, setOfferUnit] = useState(opportunity.unit);
  const [availabilityDate, setAvailabilityDate] = useState(
    opportunity.deliveryWindowStart
  );
  const [locationState, setLocationState] = useState(opportunity.targetState);
  const [locationLga, setLocationLga] = useState(opportunity.targetLga);
  const [offerNotes, setOfferNotes] = useState("");

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const coverage: CoordinationCoverageSummary = calculateCoordinationCoverage({
    opportunityId: opportunity.id,
    requiredQuantityKg: opportunity.canonicalQuantityKg,
    acceptedCommitments: commitments,
    allCommitments: commitments,
    fulfilledQuantityKg: opportunity.fulfilledQuantity,
  });

  const isCoordinator = Boolean(
    currentUserId &&
      (opportunity.creatorId === currentUserId || _currentUserRole === "ADMIN")
  );

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError(null);
    setOfferSuccess(null);

    if (!offerQuantity || Number(offerQuantity) <= 0) {
      setOfferError("Please enter a valid quantity greater than 0.");
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const res = await offerSupplyCommitmentAction({
        opportunityId: opportunity.id,
        commodity: opportunity.commodity,
        committedQuantity: Number(offerQuantity),
        unit: offerUnit,
        availabilityDate,
        locationState,
        locationLga,
        notes: offerNotes || null,
      });

      if (!res.success) {
        setOfferError(res.error || "Failed to submit commitment offer.");
      } else if (res.data) {
        setOfferSuccess("Supply commitment offer submitted successfully!");
        setCommitments((prev) => [res.data!, ...prev]);
        setShowOfferForm(false);
        setOfferQuantity("");
        setOfferNotes("");
      }
    } catch (err: unknown) {
      setOfferError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleAcceptCommitment = async (commitmentId: string) => {
    setActionLoadingId(commitmentId);
    try {
      const res = await acceptSupplyCommitmentAction({ commitmentId });
      if (res.success) {
        setCommitments((prev) =>
          prev.map((c) =>
            c.id === commitmentId ? { ...c, status: "ACCEPTED" } : c
          )
        );
      } else {
        alert(res.error || "Failed to accept commitment.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdrawCommitment = async (commitmentId: string) => {
    const reason = prompt("Please provide a reason for withdrawal:");
    if (!reason) return;

    setActionLoadingId(commitmentId);
    try {
      const res = await withdrawSupplyCommitmentAction({ commitmentId, reason });
      if (res.success) {
        setCommitments((prev) =>
          prev.map((c) =>
            c.id === commitmentId ? { ...c, status: "WITHDRAWN", notes: reason } : c
          )
        );
      } else {
        alert(res.error || "Failed to withdraw commitment.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCommitment = async (commitmentId: string) => {
    setActionLoadingId(commitmentId);
    try {
      const res = await confirmSupplyCommitmentAction({
        commitmentId,
        notes: "Readiness confirmed by producer",
      });
      if (res.success) {
        setCommitments((prev) =>
          prev.map((c) =>
            c.id === commitmentId ? { ...c, status: "CONFIRMED" } : c
          )
        );
      } else {
        alert(res.error || "Failed to confirm readiness.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E5E0D5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CoordinationStatusBadge status={opportunity.status} size="md" />
            <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
              {opportunity.commodity}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Asset-Light Coordination • Zero Escrow • Advisory</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {opportunity.title}
          </h1>
          {opportunity.notes && (
            <p className="text-sm text-neutral-600 mt-1 max-w-3xl leading-relaxed">
              {opportunity.notes}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E5E0D5] text-xs text-neutral-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>
              Target Corridor: <strong>{opportunity.targetLga}, {opportunity.targetState}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>
              Window: <strong>{opportunity.deliveryWindowStart}</strong> to <strong>{opportunity.deliveryWindowEnd}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>
              Required: <strong>{opportunity.requiredQuantity.toLocaleString()} {opportunity.unit}</strong> ({opportunity.canonicalQuantityKg.toLocaleString()} kg)
            </span>
          </div>
        </div>
      </div>

      {/* Coverage Progress Card */}
      <Card className="border-[#E5E0D5]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Supply Commitment Coverage
            </CardTitle>
            <span className="text-xs font-semibold text-neutral-600">
              {coverage.remainingCapacityKg > 0
                ? `${coverage.remainingCapacityKg.toLocaleString()} kg needed`
                : "100% Committed"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <CoverageProgressBar coverage={coverage} />
        </CardContent>
      </Card>

      {/* Advisory Context Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunity.processingRequired && (
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
            <Building2 className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-purple-900 block">
                Processing Facility Transformation Planned
              </span>
              <p className="text-purple-800 leading-relaxed">
                Raw output aggregated under this coordination will route to an approved processing facility. Producers deliver raw batch; transformation yield accounting is governed by facility standards.
              </p>
            </div>
          </div>
        )}

        {opportunity.logisticsRequired && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
            <Truck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-blue-900 block">
                Coordinated Transport Corridor
              </span>
              <p className="text-blue-800 leading-relaxed">
                Logistics provider coordination is enabled for this corridor. Pickups will be consolidated from registered collection points. Note: AgroMarket does not own transport assets.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requirements & Specifications */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-[#E5E0D5]">
            <CardHeader className="pb-3 border-b border-[#E5E0D5]">
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-[#0F4327]" />
                <span>Demand Specifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {requirements.length === 0 ? (
                <div className="text-xs text-neutral-500 py-2">
                  Standard commodity specifications apply for this request.
                </div>
              ) : (
                requirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">{req.title}</span>
                      {req.isMandatory ? (
                        <span className="text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                          Optional
                        </span>
                      )}
                    </div>
                    {req.description && (
                      <p className="text-neutral-600 leading-relaxed">
                        {req.description}
                      </p>
                    )}
                  </div>
                ))
              )}

              {/* Halal Anti-Pork Invariant Notice */}
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-emerald-950">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Halal Integrity & Anti-Pork Safeguard</span>
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  AgroMarket enforces zero-tolerance halal integrity. Porcine produce and uncertified mixing are strictly rejected at all value-chain checkpoints.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline / Event Ledger */}
          <Card className="border-[#E5E0D5]">
            <CardHeader className="pb-3 border-b border-[#E5E0D5]">
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-neutral-600" />
                <span>Coordination Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {events.length === 0 ? (
                <div className="text-xs text-neutral-500 py-2">
                  No events recorded yet.
                </div>
              ) : (
                events.slice(0, 8).map((evt) => (
                  <div key={evt.id} className="text-xs space-y-0.5 border-l-2 border-[#0F4327]/30 pl-3">
                    <span className="font-medium text-neutral-900 block">
                      {evt.title}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(evt.occurredAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Supply Commitments & Offer Action */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commitments Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Supply Commitments ({commitments.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Independent producer capacity offers committed against this coordination opportunity.
              </p>
            </div>

            {opportunity.status === "OPEN" || opportunity.status === "PARTIALLY_COMMITTED" ? (
              <Button
                onClick={() => setShowOfferForm(!showOfferForm)}
                className="bg-[#0F4327] hover:bg-[#0B331E] text-white text-xs"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                <span>{showOfferForm ? "Cancel Offer" : "Offer Supply Capacity"}</span>
              </Button>
            ) : null}
          </div>

          {/* Offer Supply Form Drawer */}
          {showOfferForm && (
            <Card className="border-emerald-300 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-emerald-950">
                  Offer Supply Capacity ({opportunity.commodity})
                </CardTitle>
                <p className="text-xs text-neutral-600">
                  Commit your available harvest or inventory quantity. A commitment is advisory until accepted by the coordinator.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOfferSubmit} className="space-y-4">
                  {offerError && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                      {offerError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Committed Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder="e.g. 1500"
                        value={offerQuantity}
                        onChange={(e) =>
                          setOfferQuantity(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-full text-xs px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white focus:ring-1 focus:ring-[#0F4327]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Unit *
                      </label>
                      <select
                        value={offerUnit}
                        onChange={(e) => setOfferUnit(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white"
                      >
                        <option value="KG">KG</option>
                        <option value="TONNES">TONNES</option>
                        <option value="50KG BAG">50KG BAG</option>
                        <option value="100KG BAG">100KG BAG</option>
                        <option value="CRATE">CRATE</option>
                        <option value="PIECE">PIECE</option>
                        <option value="LITRE">LITRE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Expected Availability Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={availabilityDate}
                        onChange={(e) => setAvailabilityDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        State / LGA *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={locationState}
                          onChange={(e) => setLocationState(e.target.value)}
                          placeholder="State"
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E5E0D5] bg-white"
                        />
                        <input
                          type="text"
                          required
                          value={locationLga}
                          onChange={(e) => setLocationLga(e.target.value)}
                          placeholder="LGA"
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E5E0D5] bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Notes / Specifications (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      placeholder="e.g. Clean dry tubers, moisture under 12%, stored in warehouse."
                      className="w-full text-xs p-2.5 rounded-lg border border-[#E5E0D5] bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowOfferForm(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingOffer}
                      className="bg-[#0F4327] hover:bg-[#0B331E] text-white text-xs"
                    >
                      {isSubmittingOffer ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          <span>Validating & Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Commitment Offer</span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {offerSuccess && (
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>{offerSuccess}</span>
            </div>
          )}

          {/* Commitments List */}
          {commitments.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-[#FBF9F4] text-xs text-neutral-500 space-y-2">
              <Layers className="h-6 w-6 text-neutral-400 mx-auto" />
              <p className="font-semibold text-neutral-700">
                No supply commitments submitted yet
              </p>
              <p>
                Be the first producer to offer capacity towards this coordination opportunity.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {commitments.map((commitment) => {
                const isOwner = Boolean(
                  currentUserId && commitment.participantId === currentUserId
                );
                const isLoading = actionLoadingId === commitment.id;

                return (
                  <div
                    key={commitment.id}
                    className="p-4 rounded-xl border border-[#E5E0D5] bg-white space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CommitmentStatusBadge status={commitment.status} size="sm" />
                        <span className="text-xs font-bold text-neutral-900">
                          {commitment.committedQuantity.toLocaleString()} {commitment.unit}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          ({commitment.canonicalQuantityKg.toLocaleString()} kg)
                        </span>
                      </div>

                      <div className="text-xs text-neutral-500">
                        Available: <strong>{commitment.availabilityDate}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-600">
                      <div>
                        <span className="text-neutral-500">Contributor:</span>{" "}
                        <span className="font-medium text-neutral-800">
                          {commitment.participantDisplayName || "Verified Contributor"}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Location:</span>{" "}
                        <span className="font-medium text-neutral-800">
                          {commitment.locationLga}, {commitment.locationState}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Quality Grade:</span>{" "}
                        <span className="font-medium text-neutral-800">
                          {commitment.qualityGrade}
                        </span>
                      </div>
                    </div>

                    {commitment.notes && (
                      <p className="text-xs text-neutral-600 bg-[#FBF9F4] p-2.5 rounded-lg border border-[#E5E0D5]/70">
                        {commitment.notes}
                      </p>
                    )}

                    {/* Operational Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E5E0D5]/60">
                      {/* Coordinator Actions */}
                      {isCoordinator &&
                        (commitment.status === "OFFERED" ||
                          commitment.status === "PROPOSED") && (
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleAcceptCommitment(commitment.id)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <span>Accept into Coordination</span>
                            )}
                          </Button>
                        )}

                      {/* Producer Actions */}
                      {isOwner && commitment.status === "ACCEPTED" && (
                        <Button
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleConfirmCommitment(commitment.id)}
                          className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <span>Confirm Readiness</span>
                          )}
                        </Button>
                      )}

                      {(isOwner || isCoordinator) &&
                        ["PROPOSED", "OFFERED", "ACCEPTED"].includes(
                          commitment.status
                        ) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleWithdrawCommitment(commitment.id)}
                            className="text-neutral-600 hover:text-red-700 text-xs h-7"
                          >
                            <span>Withdraw Offer</span>
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
