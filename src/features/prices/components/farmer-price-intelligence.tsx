"use client";

import React, { useState } from "react";
import { formatNGN, NIGERIAN_STATES, PRODUCE_UNITS } from "@/features/marketplace/constants";
import {
  PriceTrendResult,
  RegionalPriceComparison,
} from "../types";
import { DemandForecast, PlatformDemandSignal } from "@/features/demand/types";
import { recordPriceObservationAction } from "../actions";

interface ProductOption {
  id: string;
  name: string;
}

interface FarmerPriceIntelligenceProps {
  products: ProductOption[];
  selectedProductId: string;
  comparison: RegionalPriceComparison;
  trend: PriceTrendResult;
  demandSignal: PlatformDemandSignal;
  forecasts: DemandForecast[];
}

export function FarmerPriceIntelligence({
  products,
  selectedProductId,
  comparison,
  trend,
  demandSignal,
  forecasts,
}: FarmerPriceIntelligenceProps) {
  const [activeProductId, setActiveProductId] = useState(selectedProductId);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success?: string; error?: string } | null>(null);

  // Form state for reporting a local price
  const [reportForm, setReportForm] = useState({
    productId: selectedProductId,
    marketName: "",
    state: "Lagos" as (typeof NIGERIAN_STATES)[number],
    lga: "",
    price: "",
    unit: "50kg Bag" as (typeof PRODUCE_UNITS)[number],
  });

  const handleProductChange = (productId: string) => {
    setActiveProductId(productId);
    const params = new URLSearchParams(window.location.search);
    params.set("productId", productId);
    window.location.search = params.toString();
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const priceNum = Number(reportForm.price);
    if (!priceNum || priceNum <= 0) {
      setFeedback({ error: "Please provide a valid, positive price." });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await recordPriceObservationAction({
        productId: reportForm.productId,
        marketName: reportForm.marketName.trim(),
        state: reportForm.state,
        lga: reportForm.lga.trim() || undefined,
        price: priceNum,
        currency: "NGN",
        unit: reportForm.unit,
        sourceType: "FARMER_REPORTED",
      });

      if (res.success) {
        setFeedback({
          success:
            "Thank you! Your market price observation has been recorded as a community report.",
        });
        setShowReportModal(false);
        setReportForm({
          productId: activeProductId,
          marketName: "",
          state: "Lagos",
          lga: "",
          price: "",
          unit: "50kg Bag",
        });
      } else {
        setFeedback({ error: res.error || "Failed to record price report." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback({ error: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrendBadge = (direction: PriceTrendResult["trend"]) => {
    switch (direction) {
      case "RISING":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800">
            ↑ Rising {trend.percentageChange !== null ? `(+${trend.percentageChange}%)` : ""}
          </span>
        );
      case "FALLING":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800">
            ↓ Falling {trend.percentageChange !== null ? `(${trend.percentageChange}%)` : ""}
          </span>
        );
      case "STABLE":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
            → Stable {trend.percentageChange !== null ? `(${trend.percentageChange}%)` : ""}
          </span>
        );
      case "INSUFFICIENT_DATA":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
            – Insufficient Historical Data
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {feedback?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
          <span>{feedback.success}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 font-bold ml-4">
            ×
          </button>
        </div>
      )}
      {feedback?.error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
          <span>{feedback.error}</span>
          <button onClick={() => setFeedback(null)} className="text-red-600 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Control Bar & Quick Action */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label htmlFor="farmer-product-select" className="block text-xs font-semibold uppercase text-gray-500 mb-1">
            Focus Commodity
          </label>
          <select
            id="farmer-product-select"
            value={activeProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 px-3 border"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-colors"
        >
          + Report Local Market Price
        </button>
      </div>

      {/* Intelligence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 30-Day Trend Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Price Movement (30 Days)
          </h3>
          <div className="mt-3">{getTrendBadge(trend.trend)}</div>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {trend.percentageChange !== null && trend.percentageChange > 0
              ? `Recent market observations show an upward price movement of ${trend.percentageChange}%.`
              : trend.percentageChange !== null && trend.percentageChange < 0
              ? `Recent market observations indicate a downward price movement of ${Math.abs(trend.percentageChange)}%.`
              : "Prices have remained relatively stable across recorded markets."}
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            Based on <span className="font-semibold text-gray-800">{trend.observationCount}</span>{" "}
            available observations.
          </div>
        </div>

        {/* Platform Demand Signal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Platform Demand Signals
          </h3>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {demandSignal.totalQuantitySold30Days > 0
              ? `${demandSignal.totalQuantitySold30Days} ${demandSignal.unit}`
              : "0 " + demandSignal.unit}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Completed order volume on AgroMarket in the past 30 days
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Active buyer cart items:</span>
            <span className="font-semibold text-gray-800">{demandSignal.activeCartItemsCount}</span>
          </div>
        </div>

        {/* Regional Market Extreme */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Regional Price Differential
          </h3>
          <div className="mt-3 text-sm text-gray-700 space-y-2">
            <div>
              <span className="text-xs text-gray-400 block">Lowest Observed:</span>
              <span className="font-bold text-emerald-700">
                {comparison.lowestObserved
                  ? `${formatNGN(comparison.lowestObserved.price)} / ${comparison.canonicalUnit} (${comparison.lowestObserved.state})`
                  : "No data"}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Highest Observed:</span>
              <span className="font-bold text-gray-900">
                {comparison.highestObserved
                  ? `${formatNGN(comparison.highestObserved.price)} / ${comparison.canonicalUnit} (${comparison.highestObserved.state})`
                  : "No data"}
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-gray-400 italic">
            Evaluated across {comparison.stateSummaries.length} reporting states
          </div>
        </div>
      </div>

      {/* Demand Forecast Baseline Display */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        <div className="border-b border-gray-100 pb-4 mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Baseline Demand Forecast (Next 7 Days)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Statistical baseline derived from recent AgroMarket order moving averages.
          </p>
        </div>

        {forecasts.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            No active demand forecast recorded for this commodity yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecasts.map((f) => (
              <div
                key={f.id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {f.regionState}
                    </span>
                    <div className="text-lg font-bold text-gray-900">
                      {f.predictedDemandVolume > 0
                        ? `${f.predictedDemandVolume} ${f.volumeUnit}`
                        : "Insufficient Platform Orders"}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      f.confidenceLevel === "HIGH"
                        ? "bg-emerald-100 text-emerald-800"
                        : f.confidenceLevel === "MEDIUM"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Confidence: {f.confidenceLevel}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {f.modelMetadata?.limitationsNote ||
                    "Baseline estimate based on recent activity. Not a speculative guarantee."}
                </p>
                <div className="text-[11px] text-gray-400">
                  Forecast Window: {f.periodStart} to {f.periodEnd}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
          <strong>Advisory Note:</strong> Baseline forecasts reflect recent platform commerce and
          should be used as general context alongside local harvest cycles and seasonal conditions.
        </div>
      </div>

      {/* Report Price Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Report Local Market Commodity Price
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Help build Nigeria&apos;s transparent agricultural price index. Observations are submitted
              as self-reported community records.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Product
                </label>
                <select
                  value={reportForm.productId}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, productId: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 text-sm py-2 px-3 border"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Market Name (e.g. Mile 12, Bodija, Dawanau)
                </label>
                <input
                  type="text"
                  required
                  value={reportForm.marketName}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, marketName: e.target.value })
                  }
                  placeholder="e.g. Mile 12 International Market"
                  className="w-full rounded-lg border-gray-300 text-sm py-2 px-3 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                    State
                  </label>
                  <select
                    value={reportForm.state}
                    onChange={(e) =>
                      setReportForm({
                        ...reportForm,
                        state: e.target.value as (typeof NIGERIAN_STATES)[number],
                      })
                    }
                    className="w-full rounded-lg border-gray-300 text-sm py-2 px-3 border"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                    LGA (Optional)
                  </label>
                  <input
                    type="text"
                    value={reportForm.lga}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, lga: e.target.value })
                    }
                    placeholder="e.g. Kosofe"
                    className="w-full rounded-lg border-gray-300 text-sm py-2 px-3 border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                    Observed Price (₦ NGN)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={reportForm.price}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, price: e.target.value })
                    }
                    placeholder="85000"
                    className="w-full rounded-lg border-gray-300 text-sm py-2 px-3 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                    Produce Unit
                  </label>
                  <select
                    value={reportForm.unit}
                    onChange={(e) =>
                      setReportForm({
                        ...reportForm,
                        unit: e.target.value as (typeof PRODUCE_UNITS)[number],
                      })
                    }
                    className="w-full rounded-lg border-gray-300 text-sm py-2 px-3 border"
                  >
                    {PRODUCE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Price Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
