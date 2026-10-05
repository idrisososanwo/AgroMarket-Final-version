"use client";

import { IntelligenceEvaluation } from "../types";
import { Check, X } from "lucide-react";

interface EvaluationsTableProps {
  evaluations: IntelligenceEvaluation[];
}

export function EvaluationsTable({ evaluations }: EvaluationsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Agent Memory & Prediction Evaluations
          </h2>
          <p className="text-xs text-neutral-500">
            Historical learning record tracking predicted values against observed real-world outcomes.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
          {evaluations.length} Evaluated
        </span>
      </div>

      {evaluations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
          <p className="text-xs text-neutral-500">
            No prediction evaluations recorded yet. Evaluations are generated deterministically once actual outcomes are observed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase font-semibold text-neutral-500">
              <tr>
                <th className="px-4 py-3">Prediction Ref</th>
                <th className="px-4 py-3">Predicted vs Actual</th>
                <th className="px-4 py-3">Absolute Error</th>
                <th className="px-4 py-3">Error %</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Accuracy Score</th>
                <th className="px-4 py-3">Evaluated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {evaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-neutral-50/50">
                  <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">
                    {ev.predictionId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-semibold text-neutral-900">
                    {ev.predictedValue} → {ev.actualValue}
                  </td>
                  <td className="px-4 py-3">{ev.absoluteError}</td>
                  <td className="px-4 py-3 font-medium">
                    <span
                      className={
                        ev.percentageError <= 10
                          ? "text-emerald-700"
                          : ev.percentageError <= 25
                          ? "text-amber-700"
                          : "text-red-700"
                      }
                    >
                      {ev.percentageError}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ev.directionAccurate ? (
                      <span className="inline-flex items-center text-emerald-700 font-semibold text-[10px]">
                        <Check className="mr-1 h-3 w-3" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-600 font-semibold text-[10px]">
                        <X className="mr-1 h-3 w-3" /> Diverged
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="h-2 w-12 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full ${
                            ev.evaluationScore >= 0.8
                              ? "bg-emerald-600"
                              : ev.evaluationScore >= 0.5
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.round(ev.evaluationScore * 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px]">
                        {Math.round(ev.evaluationScore * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-neutral-400">
                    {new Date(ev.evaluatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
