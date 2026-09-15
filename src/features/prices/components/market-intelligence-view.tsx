"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  PriceObservation,
  PriceTrendResult,
  RegionalPriceComparison,
  PriceAggregation,
} from "../types";

interface ProductOption {
  id: string;
  name: string;
}

interface MarketIntelligenceViewProps {
  products: ProductOption[];
  selectedProductId: string;
  selectedState: string;
  comparison: RegionalPriceComparison;
  trend: PriceTrendResult;
  aggregation: PriceAggregation;
  recentObservations: PriceObservation[];
}

export function MarketIntelligenceView({
  products,
  selectedProductId,
  selectedState,
  comparison,
  trend,
  aggregation,
  recentObservations,
}: MarketIntelligenceViewProps) {
  const [activeProductId, setActiveProductId] = useState(selectedProductId);
  const [activeState, setActiveState] = useState(selectedState);

  const handleFilterChange = (productId: string, state: string) => {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (state) params.set("state", state);
    window.location.search = params.toString();
  };

  const getTrendBadge = (direction: PriceTrendResult["trend"]) => {
    switch (direction) {
      case "RISING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            ↑ Rising {trend.percentageChange !== null ? `(+${trend.percentageChange}%)` : ""}
          </span>
        );
      case "FALLING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            ↓ Falling {trend.percentageChange !== null ? `(${trend.percentageChange}%)` : ""}
          </span>
        );
      case "STABLE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            → Stable {trend.percentageChange !== null ? `(${trend.percentageChange}%)` : ""}
          </span>
        );
      case "INSUFFICIENT_DATA":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            – Insufficient Data
          </span>
        );
    }
  };

  const getSufficiencyBadge = (sufficiency: string) => {
    switch (sufficiency) {
      case "HIGHER_CONFIDENCE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            High Data
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Moderate
          </span>
        );
      case "LOW_DATA":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            Sparse Data
          </span>
        );
    }
  };

  const getQualityBadge = (label: string) => {
    switch (label) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            Verified
          </span>
        );
      case "OBSERVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Observed
          </span>
        );
      case "SIMULATED":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            Simulated
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Integrity Disclaimer Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-amber-500 font-bold">ℹ</div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-amber-900">
              AgroMarket Market Intelligence & Data Transparency Notice
            </h3>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              Price intelligence is computed from platform observations, community reports, and
              verified market surveys. It must not be interpreted as a guaranteed live nationwide
              market price. Historical data and test records are explicitly tagged.
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Select Product and State */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="product-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Agricultural Commodity
            </label>
            <select
              id="product-select"
              value={activeProductId}
              onChange={(e) => {
                setActiveProductId(e.target.value);
                handleFilterChange(e.target.value, activeState);
              }}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 px-3 border"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="state-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by State / Region
            </label>
            <select
              id="state-select"
              value={activeState}
              onChange={(e) => {
                setActiveState(e.target.value);
                handleFilterChange(activeProductId, e.target.value);
              }}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 px-3 border"
            >
              <option value="">All Nigeria (Nationwide Aggregate)</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Average Observed Price */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            {activeState ? `${activeState} Avg Price` : "National Avg Price"}
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {aggregation.averagePrice !== null
              ? `${formatNGN(aggregation.averagePrice)} / ${aggregation.unit}`
              : "–"}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{aggregation.observationCount} observations</span>
            {getSufficiencyBadge(aggregation.dataSufficiency)}
          </div>
        </div>

        {/* 30-Day Trend */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            30-Day Price Trend
          </div>
          <div className="mt-2 flex items-center">
            {getTrendBadge(trend.trend)}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {trend.currentPeriodAvg !== null && trend.previousPeriodAvg !== null
              ? `Prior avg: ${formatNGN(trend.previousPeriodAvg)}`
              : "Insufficient comparison window"}
          </div>
        </div>

        {/* Lowest Observed Price */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Lowest Observed
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {comparison.lowestObserved
              ? `${formatNGN(comparison.lowestObserved.price)} / ${comparison.canonicalUnit}`
              : "–"}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {comparison.lowestObserved
              ? `${comparison.lowestObserved.state} (${comparison.lowestObserved.marketName})`
              : "No records"}
          </div>
          <div className="mt-1 text-[11px] text-gray-400 italic">
            Lowest observed price among available records
          </div>
        </div>

        {/* Highest Observed Price */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Highest Observed
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {comparison.highestObserved
              ? `${formatNGN(comparison.highestObserved.price)} / ${comparison.canonicalUnit}`
              : "–"}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {comparison.highestObserved
              ? `${comparison.highestObserved.state} (${comparison.highestObserved.marketName})`
              : "No records"}
          </div>
          <div className="mt-1 text-[11px] text-gray-400 italic">
            Highest observed price among available records
          </div>
        </div>
      </div>

      {/* Regional Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Regional Price Breakdown ({comparison.productName})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Normalized canonical pricing per {comparison.canonicalUnit} across Nigerian states
            </p>
          </div>
          <div className="mt-2 md:mt-0 text-xs text-gray-500">
            Total active observations:{" "}
            <span className="font-semibold text-gray-800">{comparison.totalObservations}</span>
          </div>
        </div>

        {comparison.stateSummaries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No price observations recorded for this commodity yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">State</th>
                  <th className="px-6 py-3 text-left">Avg Price (/{comparison.canonicalUnit})</th>
                  <th className="px-6 py-3 text-left">Price Range</th>
                  <th className="px-6 py-3 text-left">Observations</th>
                  <th className="px-6 py-3 text-left">Data Quality</th>
                  <th className="px-6 py-3 text-left">Last Observed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparison.stateSummaries.map((summary) => (
                  <tr key={summary.state} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{summary.state}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-800">
                      {formatNGN(summary.averagePrice)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {formatNGN(summary.minPrice)} – {formatNGN(summary.maxPrice)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{summary.observationCount}</td>
                    <td className="px-6 py-4">{getSufficiencyBadge(summary.dataSufficiency)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(summary.lastObservedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Observations List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Recent Market Observations
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Append-only audit trail of observed prices from Nigerian markets
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Browse Marketplace Listings →
          </Link>
        </div>

        {recentObservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No recent observations found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Market & Location</th>
                  <th className="px-6 py-3 text-left">Reported Price</th>
                  <th className="px-6 py-3 text-left">Normalized</th>
                  <th className="px-6 py-3 text-left">Source</th>
                  <th className="px-6 py-3 text-left">Verification</th>
                  <th className="px-6 py-3 text-left">Observed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{obs.marketName}</div>
                      <div className="text-xs text-gray-500">
                        {obs.state} {obs.lga ? `• ${obs.lga}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {formatNGN(obs.price)} / {obs.unit}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {obs.normalizedPrice !== null ? (
                        <span className="text-gray-700">
                          {formatNGN(obs.normalizedPrice)} / {obs.normalizedUnit}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Unavailable</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-600">
                      {obs.sourceType.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-1.5">
                        {getQualityBadge(obs.dataQualityLabel)}
                        <span className="text-[11px] text-gray-400 font-mono">
                          {obs.verificationStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(obs.observedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
