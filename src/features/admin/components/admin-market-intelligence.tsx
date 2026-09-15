"use client";

import React, { useState } from "react";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import { PriceObservation } from "@/features/prices/types";
import { DemandForecast } from "@/features/demand/types";
import {
  verifyPriceObservationAction,
  rejectPriceObservationAction,
} from "@/features/prices/actions";
import { generateDemandForecastAction } from "@/features/demand/actions";

interface ProductOption {
  id: string;
  name: string;
}

interface AdminMarketIntelligenceProps {
  products: ProductOption[];
  observations: PriceObservation[];
  forecasts: DemandForecast[];
  selectedProduct: string;
  selectedState: string;
  selectedSource: string;
  selectedVerification: string;
}

export function AdminMarketIntelligence({
  products,
  observations,
  forecasts,
  selectedProduct,
  selectedState,
  selectedSource,
  selectedVerification,
}: AdminMarketIntelligenceProps) {
  const [filterProduct, setFilterProduct] = useState(selectedProduct);
  const [filterState, setFilterState] = useState(selectedState);
  const [filterSource, setFilterSource] = useState(selectedSource);
  const [filterVerification, setFilterVerification] = useState(selectedVerification);

  const [activeTab, setActiveTab] = useState<"OBSERVATIONS" | "FORECASTS">("OBSERVATIONS");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ success?: string; error?: string } | null>(null);

  // New Forecast Form
  const [forecastForm, setForecastForm] = useState({
    productId: products[0]?.id || "",
    regionState: "Lagos" as (typeof NIGERIAN_STATES)[number],
    forecastHorizonDays: 7,
    dataWindowDays: 30,
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filterProduct) params.set("productId", filterProduct);
    if (filterState) params.set("state", filterState);
    if (filterSource) params.set("sourceType", filterSource);
    if (filterVerification) params.set("verificationStatus", filterVerification);
    window.location.search = params.toString();
  };

  const resetFilters = () => {
    window.location.search = "";
  };

  const handleVerify = async (id: string) => {
    setIsProcessing(id);
    setMessage(null);
    try {
      const res = await verifyPriceObservationAction(id);
      if (res.success) {
        setMessage({ success: "Observation marked as VERIFIED." });
        window.location.reload();
      } else {
        setMessage({ error: res.error || "Failed to verify observation." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify observation.";
      setMessage({ error: msg });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setIsProcessing(id);
    setMessage(null);
    try {
      const res = await rejectPriceObservationAction(id);
      if (res.success) {
        setMessage({ success: "Observation marked as REJECTED." });
        window.location.reload();
      } else {
        setMessage({ error: res.error || "Failed to reject observation." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject observation.";
      setMessage({ error: msg });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleGenerateForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing("generating-forecast");
    setMessage(null);
    try {
      const res = await generateDemandForecastAction({
        productId: forecastForm.productId,
        regionState: forecastForm.regionState,
        forecastHorizonDays: Number(forecastForm.forecastHorizonDays),
        dataWindowDays: Number(forecastForm.dataWindowDays),
      });

      if (res.success) {
        setMessage({ success: "Baseline demand forecast successfully calculated and saved." });
        window.location.reload();
      } else {
        setMessage({ error: res.error || "Failed to generate demand forecast." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate demand forecast.";
      setMessage({ error: msg });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {message?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
          {message.success}
        </div>
      )}
      {message?.error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {message.error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab("OBSERVATIONS")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "OBSERVATIONS"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Price Observations ({observations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("FORECASTS")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "FORECASTS"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Demand Forecasts ({forecasts.length})
        </button>
      </div>

      {activeTab === "OBSERVATIONS" ? (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Product
                </label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                >
                  <option value="">All Commodities</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  State
                </label>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                >
                  <option value="">All States</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Source Type
                </label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                >
                  <option value="">All Sources</option>
                  <option value="MARKET_SURVEY">Market Survey</option>
                  <option value="FARMER_REPORTED">Farmer Reported</option>
                  <option value="PLATFORM_TRANSACTION">Platform Transaction</option>
                  <option value="COMMUNITY">Community</option>
                  <option value="PARTNER_FEED">Partner Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Verification Status
                </label>
                <select
                  value={filterVerification}
                  onChange={(e) => setFilterVerification(e.target.value)}
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                >
                  <option value="">All Statuses</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="SELF_REPORTED">Self Reported</option>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Observations Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900">
                Active Observations Audit ({observations.length})
              </span>
            </div>

            {observations.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No observations matched the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Commodity</th>
                      <th className="px-4 py-3 text-left">Market & State</th>
                      <th className="px-4 py-3 text-left">Price & Unit</th>
                      <th className="px-4 py-3 text-left">Normalized</th>
                      <th className="px-4 py-3 text-left">Source</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Observed Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {observations.map((obs) => (
                      <tr key={obs.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {obs.productName || "Unknown"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 font-medium">{obs.marketName}</div>
                          <div className="text-gray-500">{obs.state} {obs.lga ? `• ${obs.lga}` : ""}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {formatNGN(obs.price)} / {obs.unit}
                        </td>
                        <td className="px-4 py-3">
                          {obs.normalizedPrice !== null ? (
                            <span className="text-gray-700">
                              {formatNGN(obs.normalizedPrice)} / {obs.normalizedUnit}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Unavailable</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{obs.sourceType}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              obs.verificationStatus === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-800"
                                : obs.verificationStatus === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {obs.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(obs.observedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          {obs.verificationStatus !== "VERIFIED" && (
                            obs.dataQualityLabel === "SIMULATED" ? (
                              <span
                                className="inline-block px-2 py-1 text-[10px] text-gray-400 bg-gray-100 rounded border border-gray-200 cursor-not-allowed"
                                title="SIMULATED observations cannot be promoted to VERIFIED. Insert a new real observation instead."
                              >
                                Simulated
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isProcessing === obs.id}
                                onClick={() => handleVerify(obs.id)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded font-medium disabled:opacity-50"
                              >
                                Verify
                              </button>
                            )
                          )}
                          {obs.verificationStatus !== "REJECTED" && (
                            <button
                              type="button"
                              disabled={isProcessing === obs.id}
                              onClick={() => handleReject(obs.id)}
                              className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 rounded font-medium disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Demand Forecasts Tab */
        <div className="space-y-6">
          {/* Generate Forecast Panel */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Recalculate Baseline Demand Forecast
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Computes a deterministic moving average over historical AgroMarket orders.
            </p>

            <form
              onSubmit={handleGenerateForecast}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Product
                </label>
                <select
                  value={forecastForm.productId}
                  onChange={(e) =>
                    setForecastForm({ ...forecastForm, productId: e.target.value })
                  }
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Region State
                </label>
                <select
                  value={forecastForm.regionState}
                  onChange={(e) =>
                    setForecastForm({
                      ...forecastForm,
                      regionState: e.target.value as (typeof NIGERIAN_STATES)[number],
                    })
                  }
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Forecast Horizon (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={forecastForm.forecastHorizonDays}
                  onChange={(e) =>
                    setForecastForm({
                      ...forecastForm,
                      forecastHorizonDays: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs rounded-lg border-gray-300 py-2 px-2.5 border"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isProcessing === "generating-forecast"}
                  className="w-full px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg disabled:opacity-50"
                >
                  {isProcessing === "generating-forecast"
                    ? "Calculating..."
                    : "Generate Forecast"}
                </button>
              </div>
            </form>
          </div>

          {/* Active Forecasts List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">
                Active Demand Forecast Records ({forecasts.length})
              </span>
            </div>

            {forecasts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No demand forecasts have been calculated yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Commodity</th>
                      <th className="px-4 py-3 text-left">Region State</th>
                      <th className="px-4 py-3 text-left">Period</th>
                      <th className="px-4 py-3 text-left">Predicted Volume</th>
                      <th className="px-4 py-3 text-left">Confidence Level</th>
                      <th className="px-4 py-3 text-left">Method</th>
                      <th className="px-4 py-3 text-left">Generated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {forecasts.map((fc) => (
                      <tr key={fc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {fc.productName || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{fc.regionState}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {fc.periodStart} to {fc.periodEnd}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {fc.predictedDemandVolume} {fc.volumeUnit}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              fc.confidenceLevel === "HIGH"
                                ? "bg-emerald-100 text-emerald-800"
                                : fc.confidenceLevel === "MEDIUM"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {fc.confidenceLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{fc.forecastMethod}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(fc.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
