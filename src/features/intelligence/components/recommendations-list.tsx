"use client";

import { useState } from "react";
import { IntelligenceRecommendation } from "../types";
import { reviewRecommendationAction } from "../actions";
import {
  Lightbulb,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  MapPin,
  ShieldCheck,
} from "lucide-react";

interface RecommendationsListProps {
  recommendations: IntelligenceRecommendation[];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleReview = async (recommendationId: string, decision: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await reviewRecommendationAction({
        recommendationId,
        decision,
        reviewNotes: reviewNotes || `Decision recorded as ${decision} via admin verification console.`,
      });

      if (res.success) {
        setActionMessage(`Recommendation successfully marked as ${decision}.`);
        setReviewingId(null);
        setReviewNotes("");
      } else {
        setActionMessage(`Review failed: ${res.error}`);
      }
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Error submitting review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: IntelligenceRecommendation["status"]) => {
    switch (status) {
      case "PROPOSED":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Clock className="mr-1 h-3 w-3" /> Proposed
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle className="mr-1 h-3 w-3" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
            <XCircle className="mr-1 h-3 w-3" /> Rejected
          </span>
        );
      case "EXECUTED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            <ShieldCheck className="mr-1 h-3 w-3" /> Executed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Advisory Recommendations (Human-in-the-Loop)
          </h2>
          <p className="text-xs text-neutral-500">
            Recommendations are non-autonomous and require verified human review before execution.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
          {recommendations.length} Recommendations
        </span>
      </div>

      {actionMessage && (
        <div className="rounded-lg bg-neutral-100 p-3 text-xs font-medium text-neutral-800">
          {actionMessage}
        </div>
      )}

      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
          <p className="text-xs text-neutral-500">
            No advisory recommendations currently open for review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-neutral-900">{rec.title}</h3>
                      {getStatusBadge(rec.status)}
                    </div>
                    <div className="mt-0.5 flex items-center space-x-3 text-[11px] text-neutral-500">
                      <span>Objective: {rec.objective.replace(/_/g, " ")}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <MapPin className="mr-0.5 h-3 w-3 text-neutral-400" />
                        {rec.affectedLocations.join(", ") || "National"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700">
                    Confidence: {Math.round(rec.confidence * 100)}%
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-700">{rec.recommendation}</p>

              {/* Expected Impact */}
              {rec.expectedImpact && (
                <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5 text-xs text-emerald-900 flex items-start space-x-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-800">
                      Expected Impact ({rec.expectedImpact.timeframeDays}d):{" "}
                    </span>
                    <span>{rec.expectedImpact.estimatedChange} — {rec.expectedImpact.qualitativeSummary}</span>
                  </div>
                </div>
              )}

              {/* Human Review Controls */}
              {rec.status === "PROPOSED" && (
                <div className="pt-2 border-t border-neutral-100">
                  {reviewingId === rec.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Optional review notes..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs"
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleReview(rec.id, "APPROVED")}
                          className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          Confirm Approval
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleReview(rec.id, "REJECTED")}
                          className="rounded-md bg-red-700 px-3 py-1 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewingId(null)}
                          className="text-xs text-neutral-500 hover:text-neutral-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">
                        Advisory review required before downstream alerting.
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewingId(rec.id)}
                        className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Review Recommendation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
