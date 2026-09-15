"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  MapPin,
  TrendingDown,
} from "lucide-react";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  addSmartBasketToCartAction,
  generateSmartBasketAction,
  saveUserPreferencesAction,
  updateBasketFeedbackAction,
} from "../actions";
import {
  BasketPurpose,
  SmartBasketItemRecommendation,
  SmartBasketResult,
  UserPreferences,
} from "../types";

interface SmartBasketViewProps {
  initialPreferences: UserPreferences | null;
  initialBasket: SmartBasketResult | null;
  categories: { id: string; name: string; slug: string }[];
}

export function SmartBasketView({
  initialPreferences,
  initialBasket,
  categories,
}: SmartBasketViewProps) {
  const router = useRouter();

  // Generator form state
  const [budget, setBudget] = useState<number>(
    initialPreferences?.budgetTargetBasket || 100000
  );
  const [state, setState] = useState<string>(
    initialPreferences?.state || "Lagos"
  );
  const [lga, setLga] = useState<string>(initialPreferences?.lga || "");
  const [familySize, setFamilySize] = useState<number>(
    initialPreferences?.familySize || 4
  );
  const [basketPurpose, setBasketPurpose] = useState<BasketPurpose>(
    initialPreferences?.basketPurpose || "HOUSEHOLD"
  );

  // Active Basket state
  const [basket, setBasket] = useState<SmartBasketResult | null>(initialBasket);
  const [items, setItems] = useState<SmartBasketItemRecommendation[]>(
    initialBasket?.items || []
  );

  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preferred staples/categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialPreferences?.preferredCategories || []
  );
  const [staplesInput, setStaplesInput] = useState<string>(
    (initialPreferences?.preferredStaples || []).join(", ")
  );

  // Dynamic calculated totals based on current user adjustments
  const currentTotalCost = Number(
    items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)
  );
  const remainingBudget = Number((budget - currentTotalCost).toFixed(2));
  const budgetPercentage = Math.min(100, Math.round((currentTotalCost / budget) * 100));

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setMessage(null);

    try {
      const preferredStaples = staplesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await generateSmartBasketAction({
        budget,
        state,
        lga: lga || undefined,
        familySize,
        basketPurpose,
        preferredCategories: selectedCategories,
        preferredStaples,
      });

      if (res.success && res.data) {
        setBasket(res.data);
        setItems(res.data.items);
        setMessage({
          type: "success",
          text: "Smart Basket generated successfully with fresh marketplace inventory.",
        });
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to generate Smart Basket.",
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePreferences = async () => {
    setMessage(null);
    try {
      const preferredStaples = staplesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await saveUserPreferencesAction({
        budgetTargetBasket: budget,
        state,
        lga: lga || null,
        familySize,
        basketPurpose,
        preferredCategories: selectedCategories,
        preferredStaples,
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: "Preferences saved. They will be used for future recommendations.",
        });
        setIsPreferencesOpen(false);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to save preferences.",
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save preferences.",
      });
    }
  };

  const handleUpdateQuantity = (listingId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.listingId === listingId) {
          const newQty = item.recommendedQuantity + delta;
          if (newQty < item.moq || newQty > item.quantityAvailable) {
            return item;
          }
          const subtotal = Number((newQty * item.pricePerUnit).toFixed(2));
          return {
            ...item,
            recommendedQuantity: newQty,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (listingId: string) => {
    setItems((prev) => prev.filter((item) => item.listingId !== listingId));
  };

  const handleAddToCart = async () => {
    if (!basket || items.length === 0) return;
    setIsAddingToCart(true);
    setMessage(null);

    try {
      const payload = {
        recommendationId: basket.id,
        items: items.map((i) => ({
          listingId: i.listingId,
          quantity: i.recommendedQuantity,
        })),
      };

      const res = await addSmartBasketToCartAction(payload);

      if (res.success && res.data) {
        setMessage({
          type: "success",
          text: `Added ${res.data.addedCount} items to your cart! Re-directing to checkout...`,
        });
        setTimeout(() => {
          router.push("/cart");
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to add items to cart. Some listings may have updated.",
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add to cart.",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleRejectBasket = async () => {
    if (!basket) return;
    try {
      await updateBasketFeedbackAction({
        recommendationId: basket.id,
        status: "REJECTED",
      });
      setItems([]);
      setBasket(null);
      setMessage({
        type: "success",
        text: "Basket dismissed. You can adjust parameters and generate a new basket.",
      });
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Phase 1.0 Transparent Recommendation Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                AgroMarket Smart Basket
              </h1>
              <p className="mt-1 text-sm text-neutral-600 max-w-2xl">
                Plan your household or commercial produce purchase efficiently. Our engine matches
                your budget with authoritative live Nigerian farm listings, factoring in regional proximity,
                staple preferences, and fair market prices.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 shadow-sm transition"
              >
                <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
                Preferences
              </button>

              <Link
                href="/cart"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                View Cart
              </Link>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{message.text}</div>
            </div>
          )}

          {/* Preferences Configuration Drawer / Card */}
          {isPreferencesOpen && (
            <div className="mt-6 pt-6 border-t border-neutral-100 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900">
                Custom Buyer Preferences & Staple Criteria
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Preferred Staples (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={staplesInput}
                    onChange={(e) => setStaplesInput(e.target.value)}
                    placeholder="Rice, Beans, Garri, Yam"
                    className="w-full text-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Local Government Area (LGA)
                  </label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Kosofe, Ikeja"
                    className="w-full text-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Preferred Produce Categories
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {categories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            isSelected
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generator Controls Card */}
        <form
          onSubmit={handleGenerate}
          className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
            Set Basket Generation Criteria
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Target Budget (₦)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-neutral-500 font-semibold">
                  ₦
                </span>
                <input
                  type="number"
                  min="5000"
                  step="5000"
                  required
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full text-xs pl-7 rounded-lg border-neutral-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Delivery / Proximity State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
              >
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Household Size
              </label>
              <select
                value={familySize}
                onChange={(e) => setFamilySize(Number(e.target.value))}
                className="w-full text-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
              >
                <option value={1}>Individual (1 person)</option>
                <option value={2}>Small Household (2 people)</option>
                <option value={4}>Medium Household (4 people)</option>
                <option value={6}>Large Household (6 people)</option>
                <option value={10}>Extended Family / Group (10+ people)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Basket Purpose
              </label>
              <select
                value={basketPurpose}
                onChange={(e) => setBasketPurpose(e.target.value as BasketPurpose)}
                className="w-full text-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
              >
                <option value="HOUSEHOLD">Household Staples Restock</option>
                <option value="BULK_SHARING">Group / Shared Purchase</option>
                <option value="SMALL_COMMERCIAL">Small Food Business / Catering</option>
                <option value="INDIVIDUAL">Personal Weekly Essentials</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Generating Basket...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Smart Basket
                </>
              )}
            </button>
          </div>
        </form>

        {/* Generated Basket Results */}
        {basket && (
          <div className="space-y-6">
            {/* Basket Financial Overview Bar */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">{basket.title}</h2>
                  <p className="text-xs text-neutral-600 mt-0.5">{basket.rationale}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-neutral-500 font-medium">Estimated Basket Total</div>
                    <div className="text-2xl font-extrabold text-emerald-800">
                      {formatNGN(currentTotalCost)}
                    </div>
                  </div>

                  {basket.estimatedSavings > 0 && (
                    <div className="hidden sm:block text-right border-l border-neutral-200 pl-4">
                      <div className="text-xs text-emerald-700 font-medium flex items-center justify-end gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Estimated Savings
                      </div>
                      <div className="text-base font-bold text-emerald-700">
                        {formatNGN(basket.estimatedSavings)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress & Budget Breakdown */}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>
                    Budget Utilization: <strong>{budgetPercentage}%</strong>
                  </span>
                  <span>
                    Allocated Budget: <strong>{formatNGN(budget)}</strong> | Remaining:{" "}
                    <strong className={remainingBudget < 0 ? "text-red-600" : "text-emerald-700"}>
                      {formatNGN(remainingBudget)}
                    </strong>
                  </span>
                </div>

                <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      budgetPercentage > 100
                        ? "bg-red-500"
                        : budgetPercentage > 85
                        ? "bg-emerald-600"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, budgetPercentage)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recommended Produce Items Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Recommended Commodities ({items.length})
                </h3>
                <span className="text-xs text-neutral-500">
                  Quantities default to farmer Minimum Order Quantity (MOQ)
                </span>
              </div>

              {items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-sm text-neutral-500 space-y-3">
                  <p className="font-semibold text-neutral-800">No items currently in this basket.</p>
                  <p className="text-xs max-w-md mx-auto">
                    Try adjusting your budget or state parameters and click &quot;Generate Smart Basket&quot; to
                    assemble an optimized bundle.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.listingId}
                      className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-emerald-200 transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Meta */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                            {item.categoryName}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.listingId)}
                            className="text-neutral-400 hover:text-red-600 transition"
                            title="Remove recommendation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Title & Price */}
                        <h4 className="text-base font-bold text-neutral-900">{item.productName}</h4>
                        <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{item.state}</span>
                          {item.lga && <span>• {item.lga}</span>}
                          <span>• Sourced from {item.sellerName || "Local Farm"}</span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-lg font-extrabold text-neutral-900">
                            {formatNGN(item.pricePerUnit)}
                          </span>
                          <span className="text-xs text-neutral-500">/ {item.unit}</span>
                        </div>

                        {/* Transparent Explanations */}
                        <div className="mt-3 bg-neutral-50 rounded-lg p-3 border border-neutral-100 space-y-1">
                          <div className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                            <Info className="w-3 h-3 text-emerald-700" />
                            Why recommended:
                          </div>
                          <ul className="text-xs text-neutral-600 list-disc list-inside space-y-0.5">
                            {item.explanations.map((exp, idx) => (
                              <li key={idx}>{exp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Bottom Adjustments & Subtotal */}
                      <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-600 font-medium">Qty:</span>
                          <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                            <button
                              type="button"
                              disabled={item.recommendedQuantity <= item.moq}
                              onClick={() => handleUpdateQuantity(item.listingId, -1)}
                              className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-semibold text-neutral-900">
                              {item.recommendedQuantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.recommendedQuantity >= item.quantityAvailable}
                              onClick={() => handleUpdateQuantity(item.listingId, 1)}
                              className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[11px] text-neutral-500">
                            (Min: {item.moq})
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-neutral-500 font-medium">Subtotal</div>
                          <div className="text-sm font-bold text-neutral-900">
                            {formatNGN(item.subtotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commit to Cart Actions Bar */}
            {items.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Authoritative Server Verification
                  </div>
                  <p className="text-xs text-neutral-500 max-w-lg">
                    When adding to cart, AgroMarket re-verifies live inventory and prices with local
                    producers. Never charges synthetic rates or unverified amounts.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleRejectBasket}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-xl transition"
                  >
                    Dismiss Basket
                  </button>

                  <button
                    type="button"
                    disabled={isAddingToCart}
                    onClick={handleAddToCart}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow transition disabled:opacity-50"
                  >
                    {isAddingToCart ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        Adding to Cart...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        Add Selected to Cart ({formatNGN(currentTotalCost)})
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nutritional & Advisory Notice */}
        <div className="rounded-xl bg-neutral-100 p-4 text-xs text-neutral-600 border border-neutral-200 space-y-1">
          <div className="font-semibold text-neutral-800 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-neutral-700" />
            General Produce Planning Notice
          </div>
          <p>
            AgroMarket Smart Basket recommendations provide commodity purchasing guidance based
            on seasonal food availability, physical Nigerian market prices, and user-defined staple
            budgets. This feature is strictly educational and logistical, not a medical diet prescription
            or nutritional therapy plan.
          </p>
        </div>
      </div>
    </div>
  );
}
