"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNGN, NIGERIAN_STATES, PRODUCE_UNITS } from "@/features/marketplace/constants";
import {
  PriceObservation,
  PriceTrendResult,
  RegionalPriceComparison,
  PriceAggregation,
} from "../types";
import { getTradeUnitSpec } from "../normalization";
import { recordPriceObservationAction } from "../actions";

interface ProductOption {
  id: string;
  name: string;
}

export interface ActiveMarketplaceOffer {
  id: string;
  title: string;
  pricePerUnit: number;
  unit: string;
  minimumOrderQuantity: number;
  state: string;
  lga: string;
  isVerified: boolean;
  farmName: string | null;
  quantityAvailable: number;
}

interface MarketIntelligenceViewProps {
  products: ProductOption[];
  selectedProductId: string;
  selectedState: string;
  comparison: RegionalPriceComparison;
  trend: PriceTrendResult;
  aggregation: PriceAggregation;
  recentObservations: PriceObservation[];
  activeOffers?: ActiveMarketplaceOffer[];
}

export function MarketIntelligenceView({
  products,
  selectedProductId,
  selectedState,
  comparison,
  trend,
  aggregation,
  recentObservations,
  activeOffers = [],
}: MarketIntelligenceViewProps) {
  const [activeProductId, setActiveProductId] = useState(selectedProductId);
  const [activeState, setActiveState] = useState(selectedState);

  // Price submission contribution modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    success?: string;
    error?: string;
  } | null>(null);

  const [submitForm, setSubmitForm] = useState({
    productId: selectedProductId,
    marketName: "",
    state: (selectedState || "Lagos") as (typeof NIGERIAN_STATES)[number],
    lga: "",
    price: "",
    unit: (comparison.dominantTradeUnit || "50kg Bag") as (typeof PRODUCE_UNITS)[number],
  });

  const selectedProduct = products.find((p) => p.id === activeProductId);
  const tradeSpec = getTradeUnitSpec(comparison.dominantTradeUnit || "50kg Bag");

  const handleFilterChange = (productId: string, state: string) => {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (state) params.set("state", state);
    window.location.search = params.toString();
  };

  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitFeedback(null);

    const priceNum = Number(submitForm.price);
    if (!priceNum || priceNum <= 0) {
      setSubmitFeedback({ error: "Please provide a valid, positive price in Nigerian Naira." });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await recordPriceObservationAction({
        productId: submitForm.productId,
        marketName: submitForm.marketName.trim(),
        state: submitForm.state,
        lga: submitForm.lga.trim() || undefined,
        price: priceNum,
        currency: "NGN",
        unit: submitForm.unit,
        sourceType: "MARKET_SURVEY",
      });

      if (res.success) {
        setSubmitFeedback({
          success:
            "Thank you! Your market price observation has been recorded as an authenticated community report.",
        });
        setTimeout(() => {
          setShowSubmitModal(false);
          window.location.reload();
        }, 1200);
      } else {
        setSubmitFeedback({
          error: res.error || "Failed to record price observation. You may need to sign in.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record observation.";
      setSubmitFeedback({ error: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrendBadge = (direction: PriceTrendResult["trend"]) => {
    switch (direction) {
      case "RISING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">
            – Insufficient Window
          </span>
        );
    }
  };

  const getSufficiencyBadge = (sufficiency: string) => {
    switch (sufficiency) {
      case "HIGHER_CONFIDENCE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            High Confidence
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Moderate Sample
          </span>
        );
      case "LOW_DATA":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            Initial Sample
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
            Field Survey
          </span>
        );
      case "SIMULATED":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            Benchmark
          </span>
        );
    }
  };

  const hasObservations = comparison.stateSummaries.length > 0;

  return (
    <div className="space-y-8">
      {/* Integrity & Survey Schedule Notice */}
      <div className="bg-neutral-50 border-l-4 border-emerald-600 p-4 rounded-r-xl shadow-xs">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-emerald-700 font-bold text-sm">ℹ</div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Agricultural Price Intelligence & Field Survey Notice
            </h3>
            <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
              Price intelligence is aggregated from field surveys conducted at key wholesale trade
              hubs (Mile 12, Dawanau, Bodija, Wuse, Gboko), verified farm-gate transactions, and
              authenticated community reports. Figures represent surveyed market observations and
              must not be interpreted as nationwide retail price guarantees.
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Select Produce, State, and Contribute */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div>
              <label
                htmlFor="product-select"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
              >
                Agricultural Commodity
              </label>
              <select
                id="product-select"
                value={activeProductId}
                onChange={(e) => {
                  setActiveProductId(e.target.value);
                  handleFilterChange(e.target.value, activeState);
                }}
                className="w-full rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600 text-sm py-2.5 px-3 border bg-white text-neutral-900"
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
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5"
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
                className="w-full rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600 text-sm py-2.5 px-3 border bg-white text-neutral-900"
              >
                <option value="">All Nigeria (Nationwide Benchmark)</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="shrink-0 pt-1">
            <button
              type="button"
              onClick={() => {
                setSubmitForm((prev) => ({
                  ...prev,
                  productId: activeProductId,
                  unit: (comparison.dominantTradeUnit || "50kg Bag") as (typeof PRODUCE_UNITS)[number],
                }));
                setShowSubmitModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
            >
              + Submit Local Market Price
            </button>
          </div>
        </div>

        {/* Selected Commodity Specification Context */}
        {selectedProduct && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs text-neutral-600 gap-2">
            <div>
              <span className="font-semibold text-neutral-800">{selectedProduct.name}</span>
              {" • "}
              <span>Packaging: <strong>{tradeSpec.displayName}</strong></span>
              {" • "}
              <span className="text-neutral-500">{tradeSpec.estimatedPhysicalQuantity}</span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Corridor Standard: {tradeSpec.tradeContext}
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Observed Price */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            {activeState ? `${activeState} Average` : "National Average"}
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">
            {aggregation.averagePrice !== null
              ? `${formatNGN(aggregation.averagePrice)} / ${aggregation.unit}`
              : "–"}
          </div>
          {typeof comparison.dominantTradeUnitAverage === "number" && comparison.dominantTradeUnit && (
            <div className="mt-0.5 text-xs font-semibold text-emerald-800">
              ≈ {formatNGN(comparison.dominantTradeUnitAverage)} / {comparison.dominantTradeUnit}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
            <span>{aggregation.observationCount} observations</span>
            {getSufficiencyBadge(aggregation.dataSufficiency)}
          </div>
        </div>

        {/* 30-Day Trend */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            30-Day Trend
          </div>
          <div className="mt-2 flex items-center">
            {getTrendBadge(trend.trend)}
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            {trend.currentPeriodAvg !== null && trend.previousPeriodAvg !== null
              ? `Prior 30d avg: ${formatNGN(trend.previousPeriodAvg)}`
              : "Insufficient comparison window"}
          </div>
        </div>

        {/* Lowest Observed Price */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Lowest Observed Hub
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {comparison.lowestObserved
              ? `${formatNGN(comparison.lowestObserved.price)} / ${comparison.canonicalUnit}`
              : "–"}
          </div>
          {typeof comparison.lowestObserved?.originalPrice === "number" && comparison.lowestObserved?.originalUnit && (
            <div className="mt-0.5 text-xs font-semibold text-neutral-700">
              ≈ {formatNGN(comparison.lowestObserved.originalPrice)} / {comparison.lowestObserved.originalUnit}
            </div>
          )}
          <div className="mt-1 text-xs text-neutral-600 truncate">
            {comparison.lowestObserved
              ? `${comparison.lowestObserved.state} (${comparison.lowestObserved.marketName})`
              : "No records recorded"}
          </div>
        </div>

        {/* Highest Observed Price */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Highest Observed Hub
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">
            {comparison.highestObserved
              ? `${formatNGN(comparison.highestObserved.price)} / ${comparison.canonicalUnit}`
              : "–"}
          </div>
          {typeof comparison.highestObserved?.originalPrice === "number" && comparison.highestObserved?.originalUnit && (
            <div className="mt-0.5 text-xs font-semibold text-neutral-700">
              ≈ {formatNGN(comparison.highestObserved.originalPrice)} / {comparison.highestObserved.originalUnit}
            </div>
          )}
          <div className="mt-1 text-xs text-neutral-600 truncate">
            {comparison.highestObserved
              ? `${comparison.highestObserved.state} (${comparison.highestObserved.marketName})`
              : "No records recorded"}
          </div>
        </div>
      </div>

      {/* Regional Comparison Table OR Informative Empty State */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Regional Price Breakdown ({comparison.productName})
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Normalized pricing per {comparison.canonicalUnit} and standard commercial trade units across monitored states
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            Total active observations:{" "}
            <span className="font-semibold text-neutral-800">{comparison.totalObservations}</span>
          </div>
        </div>

        {!hasObservations ? (
          <div className="p-8 sm:p-12 text-center bg-neutral-50/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mb-3 font-bold text-lg">
              🌾
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Survey Data In Progress for {comparison.productName}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed">
              Field market surveys for this commodity are scheduled across regional agricultural hubs (e.g. Dawanau, Mile 12, Bodija, and Gboko). No verified observations have been logged for the current survey window.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
              >
                + Contribute Local Market Price
              </button>
              <Link
                href={`/marketplace?search=${encodeURIComponent(comparison.productName)}`}
                className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Browse Producer Listings in Marketplace &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">State</th>
                  <th className="px-6 py-3.5 text-left">Normalized (/{comparison.canonicalUnit})</th>
                  <th className="px-6 py-3.5 text-left">Standard Trade Packaging</th>
                  <th className="px-6 py-3.5 text-left">Price Range</th>
                  <th className="px-6 py-3.5 text-left">Observations</th>
                  <th className="px-6 py-3.5 text-left">Confidence</th>
                  <th className="px-6 py-3.5 text-left">Last Observed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {comparison.stateSummaries.map((summary) => (
                  <tr key={summary.state} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{summary.state}</td>
                    <td className="px-6 py-4 font-black text-emerald-800">
                      {formatNGN(summary.averagePrice)}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-neutral-700">
                      {summary.originalUnitPrice && summary.originalUnit
                        ? `${formatNGN(summary.originalUnitPrice)} / ${summary.originalUnit}`
                        : "–"}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 text-xs">
                      {formatNGN(summary.minPrice)} – {formatNGN(summary.maxPrice)}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{summary.observationCount}</td>
                    <td className="px-6 py-4">{getSufficiencyBadge(summary.dataSufficiency)}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500">
                      {new Date(summary.lastObservedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Marketplace Producer Offers Benchmark */}
      {activeOffers.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-neutral-900">
                  Active Farm-Gate Producer Offers on AgroMarket
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Real producer inventory available for purchase directly from verified Nigerian farms
              </p>
            </div>
            <Link
              href={`/marketplace?search=${encodeURIComponent(comparison.productName)}`}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              View all in marketplace &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-2 hover:border-emerald-500 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">
                    {offer.title}
                  </h4>
                  {offer.isVerified ? (
                    <span className="shrink-0 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Verified Stock
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-medium text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded">
                      Producer Stock
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-base font-black text-neutral-900">
                      {formatNGN(offer.pricePerUnit)}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium"> / {offer.unit}</span>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    MOQ: {offer.minimumOrderQuantity} {offer.unit}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 pt-1 flex items-center justify-between">
                  <span>{offer.lga}, {offer.state}</span>
                  <span>{offer.quantityAvailable} {offer.unit} available</span>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/marketplace/${offer.id}`}
                    className="block text-center rounded-lg bg-white border border-neutral-300 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition"
                  >
                    View Offer Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Market Observations List */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Audit Trail of Observed Market Prices
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Append-only historical records logged by survey enumerators and registered agribusinesses
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Browse Marketplace Produce &rarr;
          </Link>
        </div>

        {recentObservations.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No survey records logged for this commodity in the selected region yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Market & Location</th>
                  <th className="px-6 py-3.5 text-left">Reported Trade Price</th>
                  <th className="px-6 py-3.5 text-left">Normalized Base Price</th>
                  <th className="px-6 py-3.5 text-left">Data Source</th>
                  <th className="px-6 py-3.5 text-left">Verification</th>
                  <th className="px-6 py-3.5 text-left">Observed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-neutral-900">{obs.marketName}</div>
                      <div className="text-xs text-neutral-500">
                        {obs.state} {obs.lga ? `• ${obs.lga}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-neutral-900">
                      {formatNGN(obs.price)} <span className="font-normal text-xs text-neutral-500">/ {obs.unit}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      {obs.normalizedPrice !== null ? (
                        <span className="font-semibold text-neutral-800">
                          {formatNGN(obs.normalizedPrice)} / {obs.normalizedUnit}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic">Trade Unit Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-neutral-600">
                      {obs.sourceType.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        {getQualityBadge(obs.dataQualityLabel)}
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {obs.verificationStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-neutral-500">
                      {new Date(obs.observedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Price Observation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Submit Market Price Observation
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Contribute observed commodity prices from your local market or farm gate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {submitFeedback && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  submitFeedback.success
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {submitFeedback.success || submitFeedback.error}
              </div>
            )}

            <form onSubmit={handlePriceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Commodity Produce
                </label>
                <select
                  value={submitForm.productId}
                  onChange={(e) => setSubmitForm({ ...submitForm, productId: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Market Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mile 12 International Market, Dawanau, Bodija"
                  value={submitForm.marketName}
                  onChange={(e) => setSubmitForm({ ...submitForm, marketName: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={submitForm.state}
                    onChange={(e) =>
                      setSubmitForm({
                        ...submitForm,
                        state: e.target.value as (typeof NIGERIAN_STATES)[number],
                      })
                    }
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    required
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    LGA (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kosofe, Dala"
                    value={submitForm.lga}
                    onChange={(e) => setSubmitForm({ ...submitForm, lga: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Observed Price (NGN) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 85000"
                    value={submitForm.price}
                    onChange={(e) => setSubmitForm({ ...submitForm, price: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Trading Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={submitForm.unit}
                    onChange={(e) =>
                      setSubmitForm({
                        ...submitForm,
                        unit: e.target.value as (typeof PRODUCE_UNITS)[number],
                      })
                    }
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    required
                  >
                    {PRODUCE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Observation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
