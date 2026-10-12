"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  MapPin,
  TrendingDown,
  Heart,
  Check,
  X,
} from "lucide-react";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import { BackButton } from "@/components/ui/back-button";
import { ProductImage } from "@/components/ui/product-image";
import {
  addSmartBasketToCartAction,
  generateSmartBasketAction,
  saveUserPreferencesAction,
  updateBasketFeedbackAction,
} from "../actions";
import {
  BasketPurpose,
  PriorityGoal,
  SmartBasketItemRecommendation,
  SmartBasketResult,
  UserPreferences,
} from "../types";

const COMMON_ALLERGIES = [
  "Peanuts / Groundnuts",
  "Fish & Seafood",
  "Soybeans",
  "Gluten / Wheat",
  "Dairy",
  "Eggs",
  "Sesame",
];

const HEALTH_CONSIDERATIONS = [
  { id: "LOW_SODIUM", label: "Low Sodium / Hypertension-Conscious" },
  { id: "DIABETIC_FRIENDLY", label: "Diabetic-Friendly / Low-Glycemic" },
  { id: "VEGETARIAN", label: "Plant-Based / Vegetarian" },
  { id: "HALAL", label: "Strictly Halal (Certified non-swine)" },
];

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
  const resultsRef = useRef<HTMLDivElement>(null);

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
  const [durationDays, setDurationDays] = useState<number>(
    initialPreferences?.durationDays || 14
  );
  const [priorityGoal, setPriorityGoal] = useState<PriorityGoal>(
    initialPreferences?.priorityGoal || "AFFORDABILITY"
  );

  // Voluntary Health & Dietary Preferences
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    initialPreferences?.allergies || []
  );
  const [selectedHealthConsiderations, setSelectedHealthConsiderations] = useState<string[]>(
    initialPreferences?.healthConsiderations || []
  );
  const [customAllergiesInput, setCustomAllergiesInput] = useState<string>("");
  const [dislikedFoodsInput, setDislikedFoodsInput] = useState<string>(
    (initialPreferences?.dislikedItems || []).join(", ")
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
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

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
  const budgetPercentage = Math.min(
    100,
    budget > 0 ? Math.round((currentTotalCost / budget) * 100) : 0
  );

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setMessage(null);

    try {
      const preferredStaples = staplesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const additionalAllergies = customAllergiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const allAllergies = Array.from(new Set([...selectedAllergies, ...additionalAllergies]));

      const dislikedItems = dislikedFoodsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await generateSmartBasketAction({
        budget,
        state,
        lga: lga || undefined,
        familySize,
        basketPurpose,
        durationDays,
        priorityGoal,
        allergies: allAllergies,
        healthConsiderations: selectedHealthConsiderations,
        dislikedItems,
        preferredCategories: selectedCategories,
        preferredStaples,
      });

      if (res.success && res.data) {
        setBasket(res.data);
        setItems(res.data.items);

        if (res.data.items.length > 0) {
          setMessage({
            type: "success",
            text: `Smart Basket generated! Curated ${res.data.items.length} farm produce item(s) totaling ${formatNGN(res.data.estimatedTotalCost)}.`,
          });
        } else {
          setMessage({
            type: "warning",
            text:
              res.data.rationale ||
              `No eligible products could be assembled for your budget of ${formatNGN(budget)}. Please try increasing your budget or broadening your location preferences.`,
          });
        }

        // Move viewport smoothly to the results section
        setTimeout(() => {
          resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        }, 150);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to generate Smart Basket. Please verify your inputs and try again.",
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An unexpected error occurred during generation.",
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

      const additionalAllergies = customAllergiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const allAllergies = Array.from(new Set([...selectedAllergies, ...additionalAllergies]));

      const dislikedItems = dislikedFoodsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await saveUserPreferencesAction({
        budgetTargetBasket: budget,
        state,
        lga: lga || null,
        familySize,
        basketPurpose,
        durationDays,
        priorityGoal,
        allergies: allAllergies,
        healthConsiderations: selectedHealthConsiderations,
        dislikedItems,
        preferredCategories: selectedCategories,
        preferredStaples,
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: "Preferences saved successfully. They will personalize all future Smart Basket generations.",
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

  const handleClearPreferences = async () => {
    setSelectedAllergies([]);
    setSelectedHealthConsiderations([]);
    setCustomAllergiesInput("");
    setDislikedFoodsInput("");
    setSelectedCategories([]);
    setStaplesInput("");
    await saveUserPreferencesAction({
      budgetTargetBasket: budget,
      state,
      lga: lga || null,
      familySize,
      basketPurpose,
      allergies: [],
      healthConsiderations: [],
      dislikedItems: [],
      preferredCategories: [],
      preferredStaples: [],
    });
    setMessage({
      type: "success",
      text: "Dietary and staple preferences cleared.",
    });
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
          text: `Added ${res.data.addedCount} item(s) to your shopping cart! Redirecting to cart...`,
        });
        setTimeout(() => {
          router.push("/cart");
        }, 1200);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to add items to cart. Some listings may have updated inventory.",
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add items to cart.",
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
        text: "Basket dismissed. You can adjust your criteria and regenerate anytime.",
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

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const toggleHealthConsideration = (id: string) => {
    setSelectedHealthConsiderations((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Back Button */}
        <div>
          <BackButton fallbackHref="/marketplace" label="Back to Marketplace" />
        </div>

        {/* Header Banner */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Personalized Grocery Budget Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                AgroMarket Smart Basket
              </h1>
              <p className="mt-1 text-sm text-neutral-600 max-w-2xl">
                Curate your household grocery bundle with real live Nigerian farm inventory.
                We optimize across your budget, dietary needs, regional farm proximity, and past orders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 shadow-xs transition"
              >
                <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
                Dietary & Health Profile
              </button>

              <Link
                href="/cart"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
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
                  : message.type === "warning"
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : message.type === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{message.text}</div>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Preferences Configuration Drawer / Card */}
          {isPreferencesOpen && (
            <div className="mt-6 pt-6 border-t border-neutral-200 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Voluntary Health, Dietary & Allergy Preferences
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your preferences are strictly private, used exclusively to filter and score your personal basket recommendations, and never shared with producers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Allergies and Exclusions */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Food Allergies & Excluded Ingredients (Hard filter)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_ALLERGIES.map((allergy) => {
                    const isSelected = selectedAllergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => toggleAllergy(allergy)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? "bg-red-50 text-red-800 border-red-300 font-semibold"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-600" />}
                        {allergy}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={customAllergiesInput}
                  onChange={(e) => setCustomAllergiesInput(e.target.value)}
                  placeholder="Other specific ingredients to avoid (comma-separated, e.g. shellfish, cashews)"
                  className="w-full text-xs rounded-lg border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
                />
              </div>

              {/* Health Considerations */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Nutritional & Health Priorities (Soft ranking bias)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HEALTH_CONSIDERATIONS.map((hc) => {
                    const isSelected = selectedHealthConsiderations.includes(hc.id);
                    return (
                      <button
                        key={hc.id}
                        type="button"
                        onClick={() => toggleHealthConsideration(hc.id)}
                        className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium border text-left transition ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{hc.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Staples & Disliked Foods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Preferred Household Staples
                  </label>
                  <input
                    type="text"
                    value={staplesInput}
                    onChange={(e) => setStaplesInput(e.target.value)}
                    placeholder="e.g. Parboiled Rice, Brown Beans, White Garri, Yam"
                    className="w-full text-xs rounded-lg border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Disliked Foods or Produce to Avoid
                  </label>
                  <input
                    type="text"
                    value={dislikedFoodsInput}
                    onChange={(e) => setDislikedFoodsInput(e.target.value)}
                    placeholder="e.g. Okra, Bitter leaf, Ewedu"
                    className="w-full text-xs rounded-lg border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Preferred Categories */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold"
                            : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferences Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleClearPreferences}
                  className="text-xs font-medium text-red-600 hover:text-red-700 transition"
                >
                  Clear All Preferences
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreferencesOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generator Controls Form Card */}
        <form
          onSubmit={handleGenerate}
          className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-4">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
              Shopping Budget & Basket Parameters
            </h2>
            <span className="text-xs text-neutral-500">
              Delivery fees are calculated separately at checkout
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Target Budget Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Total Shopping Budget (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-neutral-500 font-bold">
                  ₦
                </span>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  required
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs font-bold text-neutral-900 pl-7 rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Hard ceiling for recommended commodity subtotals
              </p>
            </div>

            {/* Shopping Horizon */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Shopping Duration / Horizon
              </label>
              <div className="relative">
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
                >
                  <option value={7}>7 Days (Weekly Restock)</option>
                  <option value={14}>14 Days (Bi-Weekly Staples)</option>
                  <option value={30}>30 Days (Monthly Pantry Stock)</option>
                </select>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Guides quantity scaling for non-perishable staples
              </p>
            </div>

            {/* Priority Goal */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Optimization Priority
              </label>
              <select
                value={priorityGoal}
                onChange={(e) => setPriorityGoal(e.target.value as PriorityGoal)}
                className="w-full text-xs rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
              >
                <option value="AFFORDABILITY">Affordability (Lowest Farm Prices)</option>
                <option value="VARIETY">Balanced Variety Across Categories</option>
                <option value="FREQUENT_STAPLES">My Frequent Past Purchases</option>
                <option value="HEALTH_CONSCIOUS">Health-Conscious Fresh Produce</option>
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                Adjusts candidate ranking algorithm weights
              </p>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Farm Proximity / State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-xs rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
              >
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                Prioritizes local farms to minimize transit delays
              </p>
            </div>

            {/* LGA */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Local Government Area (Optional)
              </label>
              <input
                type="text"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder="e.g. Kosofe, Ikeja, Ido"
                className="w-full text-xs rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Awards proximity bonus for neighborhood farms
              </p>
            </div>

            {/* Household Size */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Household Serving Size
              </label>
              <select
                value={familySize}
                onChange={(e) => setFamilySize(Number(e.target.value))}
                className="w-full text-xs rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
              >
                <option value={1}>Individual (1 person)</option>
                <option value={2}>Small Household (2 people)</option>
                <option value={4}>Medium Household (4 people)</option>
                <option value={6}>Large Household (6 people)</option>
                <option value={10}>Extended Family / Group (10+ people)</option>
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                Scales suggested quantities within budget limits
              </p>
            </div>

            {/* Basket Purpose */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Basket Purpose
              </label>
              <select
                value={basketPurpose}
                onChange={(e) => setBasketPurpose(e.target.value as BasketPurpose)}
                className="w-full text-xs rounded-xl border-neutral-300 shadow-xs focus:border-emerald-600 focus:ring-emerald-600"
              >
                <option value="HOUSEHOLD">Household Staples Restock</option>
                <option value="BULK_SHARING">Group / Shared Purchase</option>
                <option value="SMALL_COMMERCIAL">Small Food Business / Catering</option>
                <option value="INDIVIDUAL">Personal Weekly Essentials</option>
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                Calibrates minimum order threshold sensitivity
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Live inventory check against verified Nigerian producers
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Generating Smart Basket...
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

        {/* Generated Basket Results Section */}
        <div ref={resultsRef} id="generated-basket-results" className="scroll-mt-8 space-y-6">
          {basket && (
            <div className="space-y-6">
              {/* Basket Financial Overview Bar */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <h2 className="text-lg font-extrabold text-neutral-900">
                      Your Smart Basket: {basket.title}
                    </h2>
                    <p className="text-xs text-neutral-600 mt-0.5 max-w-xl">
                      {basket.rationale}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-neutral-500 font-medium">
                        Estimated Basket Total
                      </div>
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
                      <strong
                        className={
                          remainingBudget < 0 ? "text-red-600 font-bold" : "text-emerald-700 font-bold"
                        }
                      >
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
                  <h3 className="text-sm font-bold text-neutral-900">
                    Recommended Produce Commodities ({items.length})
                  </h3>
                  <span className="text-xs text-neutral-500">
                    Quantities respect farmer Minimum Order Quantity (MOQ)
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-sm text-neutral-500 space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-neutral-800 text-base">
                      No matching produce could be assembled within this budget
                    </p>
                    <p className="text-xs max-w-md mx-auto text-neutral-600">
                      Current marketplace listings or minimum order quantities in {state} exceed your stated budget of {formatNGN(budget)}.
                      Try increasing your target budget, selecting a broader region, or clearing specific category exclusions above.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBudget((prev) => prev + 25000);
                          setTimeout(() => handleGenerate(), 50);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Increase budget by ₦25,000 & Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <div
                        key={item.listingId}
                        className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Item Top Container with Real Product Photography */}
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-neutral-200 shadow-2xs">
                              <ProductImage
                                src={item.imageUrl}
                                alt={item.productName}
                                categoryName={item.categoryName}
                                productName={item.productName}
                                aspectRatio="square"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                                  {item.categoryName}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.listingId)}
                                  className="text-neutral-400 hover:text-red-600 transition p-0.5"
                                  title="Remove recommendation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <h4 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                                {item.productName}
                              </h4>

                              <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                                <span className="truncate">
                                  {item.state}
                                  {item.lga && ` • ${item.lga}`} • {item.sellerName || "Local Farm"}
                                </span>
                              </div>

                              {item.isFrequentPurchase && (
                                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Heart className="w-3 h-3 text-amber-600 fill-amber-600" />
                                  Frequent Staple
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Unit Pricing */}
                          <div className="flex items-baseline gap-1.5 pt-1 border-t border-neutral-100">
                            <span className="text-base font-extrabold text-neutral-900">
                              {formatNGN(item.pricePerUnit)}
                            </span>
                            <span className="text-xs text-neutral-500 font-medium">
                              / {item.unit}
                            </span>
                          </div>

                          {/* Allergen Warning Flag if applicable */}
                          {item.allergenWarning && (
                            <div className="mt-2.5 p-2 rounded-lg bg-amber-50 text-amber-800 text-[11px] border border-amber-200 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{item.allergenWarning}</span>
                            </div>
                          )}

                          {/* Transparent Explanations */}
                          <div className="mt-3 bg-neutral-50 rounded-lg p-2.5 border border-neutral-100 space-y-1">
                            <div className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                              <Info className="w-3 h-3 text-emerald-700" />
                              Recommendation Rationale:
                            </div>
                            <ul className="text-[11px] text-neutral-600 list-disc list-inside space-y-0.5">
                              {item.explanations.map((exp, idx) => (
                                <li key={idx} className="leading-snug">{exp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Bottom Adjustments & Line Subtotal */}
                        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
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
                              <span className="px-2 text-xs font-bold text-neutral-900">
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
                            <div className="text-[10px] text-neutral-500 font-medium">Line Subtotal</div>
                            <div className="text-sm font-extrabold text-neutral-900">
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
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      Live Inventory Verification
                    </div>
                    <p className="text-xs text-neutral-500 max-w-lg">
                      Adding to cart re-validates current producer prices and stock availability in real time. Does not place an order or process payment until checkout.
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
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {isAddingToCart ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          Adding to Cart...
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          Add Items to Cart ({formatNGN(currentTotalCost)})
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nutritional & General Logistics Notice */}
        <div className="rounded-xl bg-neutral-100 p-4 text-xs text-neutral-600 border border-neutral-200 space-y-1">
          <div className="font-bold text-neutral-800 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-neutral-700" />
            General Agricultural Planning & Health Notice
          </div>
          <p>
            AgroMarket Smart Basket recommendations provide commodity purchasing guidance based
            on seasonal food availability, physical Nigerian farm prices, and buyer-entered grocery budgets.
            This service is strictly logistical and budget-planning software; it is not medical diagnosis,
            clinical dietetics, or health therapy. Delivery fees are determined at checkout based on farm location.
          </p>
        </div>
      </div>
    </div>
  );
}
