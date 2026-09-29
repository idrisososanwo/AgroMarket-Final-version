"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  EquipmentListing,
  EquipmentCategory,
  EquipmentCondition,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_CONDITION_LABELS,
} from "../types";
import { createEquipmentAction, updateEquipmentAction } from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  Tractor,
  AlertCircle,
  ArrowLeft,
  Save,
} from "lucide-react";

interface OwnerEquipmentFormProps {
  initialData?: EquipmentListing | null;
  isEditMode?: boolean;
}

export function OwnerEquipmentForm({
  initialData,
  isEditMode = false,
}: OwnerEquipmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState<EquipmentCategory>(
    initialData?.category || "TRACTOR"
  );
  const [makeModel, setMakeModel] = useState(initialData?.makeModel || "");
  const [yearManufactured, setYearManufactured] = useState<string>(
    initialData?.yearManufactured ? String(initialData.yearManufactured) : ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [locationState, setLocationState] = useState(
    initialData?.locationState || "Kaduna"
  );
  const [locationLga, setLocationLga] = useState(
    initialData?.locationLga || ""
  );
  const [dailyRentalRate, setDailyRentalRate] = useState<string>(
    initialData?.dailyRentalRate ? String(initialData.dailyRentalRate) : "35000"
  );
  const [cautionDeposit, setCautionDeposit] = useState<string>(
    initialData?.cautionDeposit ? String(initialData.cautionDeposit) : "50000"
  );
  const [operatorIncluded, setOperatorIncluded] = useState<boolean>(
    initialData?.operatorIncluded ?? true
  );
  const [condition, setCondition] = useState<EquipmentCondition>(
    initialData?.condition || "EXCELLENT"
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const payload = {
        name,
        category,
        makeModel: makeModel.trim() || undefined,
        yearManufactured: yearManufactured ? parseInt(yearManufactured, 10) : undefined,
        description: description.trim() || undefined,
        locationState,
        locationLga: locationLga.trim(),
        dailyRentalRate: parseFloat(dailyRentalRate),
        cautionDeposit: parseFloat(cautionDeposit || "0"),
        operatorIncluded,
        condition,
      };

      if (isEditMode && initialData) {
        const res = await updateEquipmentAction({
          equipmentId: initialData.id,
          ...payload,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to update equipment.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          router.push(`/equipment/owner/${initialData.id}`);
          router.refresh();
        }
      } else {
        const res = await createEquipmentAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create equipment listing.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else if (res.data?.equipmentId) {
          router.push(`/equipment/owner/${res.data.equipmentId}`);
          router.refresh();
        }
      }
    });
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {errorMessage && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Error: </strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Machinery Basics */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Tractor className="h-4 w-4 text-emerald-700" />
            Machinery Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Equipment Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Equipment Listing Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Massey Ferguson 375 4WD Tractor with Disc Plough"
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {EQUIPMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {EQUIPMENT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Machine Condition <span className="text-rose-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {EQUIPMENT_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {EQUIPMENT_CONDITION_LABELS[cond]}
                  </option>
                ))}
              </select>
            </div>

            {/* Make / Model */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Make & Model <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                placeholder="e.g. John Deere 5075E / Steyr 8090"
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Year Manufactured */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Year Manufactured <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                min="1970"
                max={new Date().getFullYear() + 1}
                value={yearManufactured}
                onChange={(e) => setYearManufactured(e.target.value)}
                placeholder="e.g. 2021"
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Description & Attachments <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail horsepower, included implements (harrow, ridger, trailer), fuel terms, and operating constraints..."
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100">
            Machine Base Location
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st} State
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                LGA / Town <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={locationLga}
                onChange={(e) => setLocationLga(e.target.value)}
                placeholder="e.g. Zaria / Makarfi / Chikun"
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {fieldErrors.locationLga && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.locationLga[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Commercial Pricing & Operator Policy */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100">
            Rental Rates & Operator Terms
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Daily Rental Rate (₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                required
                value={dailyRentalRate}
                onChange={(e) => setDailyRentalRate(e.target.value)}
                placeholder="45000"
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {fieldErrors.dailyRentalRate && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.dailyRentalRate[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Refundable Caution Deposit (₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={cautionDeposit}
                onChange={(e) => setCautionDeposit(e.target.value)}
                placeholder="50000"
                className="w-full rounded-lg border border-neutral-300 py-2.5 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {fieldErrors.cautionDeposit && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.cautionDeposit[0]}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={operatorIncluded}
                  onChange={(e) => setOperatorIncluded(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-900">
                    Dedicated Certified Operator Included
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Recommended for tractors, sprayers, and combines to protect equipment and ensure peak farm field performance.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
          <Link
            href="/equipment/owner"
            className="inline-flex items-center text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Cancel & Return
          </Link>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            <span>{isPending ? "Saving..." : isEditMode ? "Save Changes" : "Publish Equipment Listing"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
