"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CanonicalProductOption, MarketplaceListing } from "../types";
import { NIGERIAN_STATES, PRODUCE_UNITS } from "../constants";
import { createListingAction, updateListingAction } from "../actions";

interface ListingFormProps {
  canonicalProducts: CanonicalProductOption[];
  initialData?: MarketplaceListing;
  mode: "create" | "edit";
}

export function ListingForm({ canonicalProducts, initialData, mode }: ListingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Form State
  const [productId, setProductId] = useState(initialData?.productId || canonicalProducts[0]?.id || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [pricePerUnit, setPricePerUnit] = useState(initialData?.pricePerUnit?.toString() || "");
  const [unit, setUnit] = useState(initialData?.unit || "100kg Bag");
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(
    initialData?.minimumOrderQuantity?.toString() || "1"
  );
  const [quantityOnHand, setQuantityOnHand] = useState(
    initialData?.quantityOnHand?.toString() || "10"
  );
  const [state, setState] = useState(initialData?.state || "Kano");
  const [lga, setLga] = useState(initialData?.lga || "");
  const [pickupAddress, setPickupAddress] = useState(initialData?.pickupAddress || "");

  // Update unit default when product selection changes (only if creating)
  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    if (mode === "create") {
      const selected = canonicalProducts.find((p) => p.id === newProdId);
      if (selected && selected.defaultUnit) {
        setUnit(selected.defaultUnit);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      if (mode === "create") {
        const res = await createListingAction({
          productId,
          title,
          description,
          pricePerUnit: parseFloat(pricePerUnit),
          unit,
          minimumOrderQuantity: parseInt(minimumOrderQuantity, 10),
          quantityOnHand: parseFloat(quantityOnHand),
          state,
          lga,
          pickupAddress,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to create listing.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          return;
        }

        router.push("/farmer/listings");
        router.refresh();
      } else {
        if (!initialData) return;
        const res = await updateListingAction(initialData.id, {
          title,
          description,
          pricePerUnit: parseFloat(pricePerUnit),
          unit,
          minimumOrderQuantity: parseInt(minimumOrderQuantity, 10),
          state,
          lga,
          pickupAddress,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to update listing.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          return;
        }

        router.push("/farmer/listings");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-2">
          <svg className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-semibold">Error saving listing</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Produce Classification */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-neutral-900">1. Produce Classification</h2>

        {mode === "create" ? (
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Select Canonical Produce Type <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              Select what agricultural produce you are selling. This ensures buyers can find your product in standard catalog searches.
            </p>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            >
              {canonicalProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.categoryName})
                </option>
              ))}
            </select>
            {fieldErrors.productId && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.productId[0]}</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 p-3 text-sm">
            <span className="text-xs text-neutral-500 block">Canonical Produce</span>
            <span className="font-semibold text-neutral-900">
              {initialData?.productName} ({initialData?.categoryName})
            </span>
            <p className="text-xs text-neutral-500 mt-1">
              Canonical produce cannot be changed after creation.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Listing Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Dry White Maize - Grade 1 Clean Grains (2026 Harvest)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
            maxLength={120}
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.title[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Description & Quality Specifications
          </label>
          <textarea
            rows={4}
            placeholder="Describe produce quality, moisture content, packaging condition, or harvest date..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            maxLength={2000}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.description[0]}</p>
          )}
        </div>
      </div>

      {/* Pricing & Inventory */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-neutral-900">2. Pricing & Stock Inventory</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Price per Unit (₦ NGN) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500 font-semibold text-sm">
                ₦
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="45000"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 py-2.5 pl-8 pr-3 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              />
            </div>
            {fieldErrors.pricePerUnit && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.pricePerUnit[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Unit of Measurement <span className="text-rose-500">*</span>
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            >
              {PRODUCE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {fieldErrors.unit && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.unit[0]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Minimum Order Quantity (MOQ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={minimumOrderQuantity}
              onChange={(e) => setMinimumOrderQuantity(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            />
            <p className="text-[11px] text-neutral-500 mt-1">Minimum units a buyer must purchase.</p>
            {fieldErrors.minimumOrderQuantity && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.minimumOrderQuantity[0]}</p>
            )}
          </div>

          {mode === "create" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Initial Available Stock (Quantity on Hand) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              />
              <p className="text-[11px] text-neutral-500 mt-1">Physical stock ready in your warehouse/farm.</p>
              {fieldErrors.quantityOnHand && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.quantityOnHand[0]}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-neutral-900">3. Farm / Warehouse Location</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              State <span className="text-rose-500">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            >
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {fieldErrors.state && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.state[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Local Government Area (LGA) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dawanau, Kano Municipal, Ikorodu"
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            />
            {fieldErrors.lga && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.lga[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Pickup / Warehouse Physical Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Km 12 Dawanau Grain Market, Kano State"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
            maxLength={255}
          />
          {fieldErrors.pickupAddress && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.pickupAddress[0]}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
        >
          {isPending
            ? mode === "create"
              ? "Publishing Listing..."
              : "Saving Changes..."
            : mode === "create"
            ? "Publish Listing"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
