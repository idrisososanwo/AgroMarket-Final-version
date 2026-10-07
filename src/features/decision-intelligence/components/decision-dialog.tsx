"use client";

import React, { useState, useTransition } from "react";
import {
  GovernedDecisionRecommendation,
  UserDecisionType,
} from "../types";
import {
  recordUserDecisionAction,
  recordUserActionExecutionAction,
} from "../actions";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Bookmark,
  HelpCircle,
  UserCheck,
  ExternalLink,
  Ban,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface DecisionDialogProps {
  recommendation: GovernedDecisionRecommendation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DecisionDialog({
  recommendation,
  isOpen,
  onClose,
  onSuccess,
}: DecisionDialogProps) {
  const [selectedDecision, setSelectedDecision] = useState<UserDecisionType | null>(null);
  const [notes, setNotes] = useState("");
  const [isExternalAction, setIsExternalAction] = useState(false);
  const [externalActionDetails, setExternalActionDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const decisionOptions: Array<{
    type: UserDecisionType;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      type: "ACCEPT",
      label: "Accept Recommendation",
      description: "Proceed with exploring or adopting this suggestion.",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      color: "border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50",
    },
    {
      type: "SAVE",
      label: "Save for Later",
      description: "Bookmark this advisory for future operational review.",
      icon: <Bookmark className="h-5 w-5 text-blue-600" />,
      color: "border-blue-200 hover:border-blue-500 hover:bg-blue-50/50",
    },
    {
      type: "DEFER",
      label: "Defer Decision",
      description: "Postpone decision until additional data or conditions develop.",
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      color: "border-amber-200 hover:border-amber-500 hover:bg-amber-50/50",
    },
    {
      type: "REQUEST_MORE_INFORMATION",
      label: "Request More Details",
      description: "Explore deeper signals and regional counterpart data.",
      icon: <HelpCircle className="h-5 w-5 text-indigo-600" />,
      color: "border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50",
    },
    {
      type: "SEEK_EXPERT",
      label: "Seek Agronomic Expert",
      description: "Consult with a certified agricultural extension specialist.",
      icon: <UserCheck className="h-5 w-5 text-teal-600" />,
      color: "border-teal-200 hover:border-teal-500 hover:bg-teal-50/50",
    },
    {
      type: "TAKE_EXTERNAL_ACTION",
      label: "Taking External Action",
      description: "Acting outside AgroMarket (e.g. local market deal or farm remedy).",
      icon: <ExternalLink className="h-5 w-5 text-purple-600" />,
      color: "border-purple-200 hover:border-purple-500 hover:bg-purple-50/50",
    },
    {
      type: "DISMISS",
      label: "Dismiss Advisory",
      description: "Not relevant to my current farm/enterprise schedule.",
      icon: <Ban className="h-5 w-5 text-neutral-500" />,
      color: "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50",
    },
    {
      type: "REJECT",
      label: "Reject Recommendation",
      description: "This guidance is inapplicable or contradicts local reality.",
      icon: <XCircle className="h-5 w-5 text-rose-600" />,
      color: "border-rose-200 hover:border-rose-500 hover:bg-rose-50/50",
    },
  ];

  const handleSubmit = () => {
    if (!selectedDecision) {
      setError("Please select a decision option.");
      return;
    }

    setError(null);
    startTransition(async () => {
      // 1. Record decision
      const decRes = await recordUserDecisionAction({
        recommendationId: recommendation.id,
        decision: selectedDecision,
        actorRole: recommendation.affectedActor,
        decisionNotes: notes || undefined,
        reasoning: isExternalAction ? externalActionDetails : undefined,
      });

      if (!decRes.success) {
        setError(decRes.error || "Failed to record decision.");
        return;
      }

      // 2. If user selected external action, record action record
      if (selectedDecision === "TAKE_EXTERNAL_ACTION" || isExternalAction) {
        await recordUserActionExecutionAction({
          recommendationId: recommendation.id,
          decisionId: decRes.data?.id,
          actionType: "USER_REPORTED_EXTERNAL_ACTION",
          isExternal: true,
          verificationStatus: "USER_REPORTED",
          notes: externalActionDetails || notes || "External action performed by user.",
        });
      } else if (selectedDecision === "SAVE") {
        await recordUserActionExecutionAction({
          recommendationId: recommendation.id,
          decisionId: decRes.data?.id,
          actionType: "SAVED",
          isExternal: false,
          verificationStatus: "VERIFIED_PLATFORM",
          notes: "Saved to intelligence watchlist.",
        });
      }

      onSuccess?.();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Governed Advisory Action
            </span>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 line-clamp-1">
              Record Decision: {recommendation.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Context Summary */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Advisory Summary
            </div>
            <p className="text-neutral-700 leading-relaxed">{recommendation.summary}</p>
            <div className="text-xs text-neutral-500 pt-1">
              Rationale: <span className="text-neutral-700">{recommendation.rationale}</span>
            </div>
          </div>

          {/* Decision Choices */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Select Your Decision
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {decisionOptions.map((opt) => {
                const isSelected = selectedDecision === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setSelectedDecision(opt.type);
                      if (opt.type === "TAKE_EXTERNAL_ACTION") {
                        setIsExternalAction(true);
                      }
                    }}
                    className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                        : `${opt.color} bg-white`
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{opt.icon}</div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-neutral-900 text-xs sm:text-sm">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-neutral-500 leading-snug">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Decision Notes & Operational Context (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Decided to postpone sowing until rainfall observation confirms soil moisture."
              className="w-full text-xs sm:text-sm rounded-xl border border-neutral-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-neutral-400"
            />
          </div>

          {/* External Action Details */}
          {(selectedDecision === "TAKE_EXTERNAL_ACTION" || isExternalAction) && (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs uppercase tracking-wider">
                <ExternalLink className="h-4 w-4 text-purple-700" />
                External Action Documentation
              </div>
              <p className="text-xs text-purple-800">
                AgroMarket records this as a <strong>User-Reported External Action</strong> rather than claiming platform verification.
              </p>
              <textarea
                rows={2}
                value={externalActionDetails}
                onChange={(e) => setExternalActionDetails(e.target.value)}
                placeholder="What action did you take outside the platform? (e.g. Purchased neem oil locally; contacted neighborhood aggregator)."
                className="w-full text-xs sm:text-sm rounded-lg border border-purple-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-neutral-400"
              />
            </div>
          )}

          {/* Platform Action Direct Link */}
          {selectedDecision === "ACCEPT" && recommendation.actionPath && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <span>Ready to proceed on AgroMarket?</span>
              <Link
                href={recommendation.actionPath}
                className="font-bold underline flex items-center gap-1 hover:text-emerald-700"
              >
                Go to Action Page <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-3 bg-neutral-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !selectedDecision}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Recording...
              </>
            ) : (
              "Confirm Decision"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
