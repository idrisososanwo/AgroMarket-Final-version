"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ServiceCategory,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  PricingModel,
  PRICING_MODELS,
  PRICING_MODEL_LABELS,
  ServiceListing,
} from "../types";
import { createServiceAction, updateServiceAction } from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface ProviderServiceFormProps {
  initialData?: ServiceListing;
  mode?: "create" | "edit";
  onSuccessRedirect?: string;
}

export function ProviderServiceForm({
  initialData,
  mode = "create",
  onSuccessRedirect = "/dashboard/services",
}: ProviderServiceFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(
    initialData?.serviceCategory || "TRACTOR_OPERATOR"
  );
  const [coverageStates, setCoverageStates] = useState<string[]>(
    initialData?.coverageStates || ["Oyo"]
  );
  const [pricingModel, setPricingModel] = useState<PricingModel>(
    initialData?.pricingModel || "PER_HECTARE"
  );
  const [baseRate, setBaseRate] = useState(
    initialData?.baseRate !== undefined ? initialData.baseRate.toString() : "0"
  );
  const [isAvailable, setIsAvailable] = useState(
    initialData?.isAvailable !== undefined ? initialData.isAvailable : true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const toggleState = (st: string) => {
    if (coverageStates.includes(st)) {
      if (coverageStates.length > 1) {
        setCoverageStates(coverageStates.filter((s) => s !== st));
      }
    } else {
      setCoverageStates([...coverageStates, st]);
    }
  };

  const selectAllStates = () => {
    setCoverageStates([...NIGERIAN_STATES]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const response = await createServiceAction({
          title,
          description,
          serviceCategory,
          coverageStates,
          pricingModel,
          baseRate: Number(baseRate) || 0,
          currency: "NGN",
          isAvailable,
        });

        if (!response.success) {
          setErrorMessage(response.error || "Failed to create service offering.");
          if (response.fieldErrors) setFieldErrors(response.fieldErrors);
        } else {
          setIsSuccess(true);
          router.push(onSuccessRedirect);
          router.refresh();
        }
      } else if (mode === "edit" && initialData) {
        const response = await updateServiceAction({
          serviceId: initialData.id,
          title,
          description,
          serviceCategory,
          coverageStates,
          pricingModel,
          baseRate: Number(baseRate) || 0,
          currency: "NGN",
          isAvailable,
        });

        if (!response.success) {
          setErrorMessage(response.error || "Failed to update service offering.");
          if (response.fieldErrors) setFieldErrors(response.fieldErrors);
        } else {
          setIsSuccess(true);
          router.push(onSuccessRedirect);
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected network error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          {mode === "create" ? "List New Service Offering" : "Edit Service Offering"}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Publish verified agricultural services to farmers across Nigeria.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Service offering saved successfully. Redirecting...</span>
        </div>
      )}

      {/* Service Category & Title */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="service-category"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Service Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="service-category"
            value={serviceCategory}
            onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            aria-describedby={fieldErrors.serviceCategory ? "cat-err" : undefined}
          >
            {SERVICE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {SERVICE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          {fieldErrors.serviceCategory && (
            <p id="cat-err" className="mt-1 text-xs text-rose-600">
              {fieldErrors.serviceCategory[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="service-title"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Service Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="service-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 75HP Tractor Ploughing & Ridging"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            aria-describedby={fieldErrors.title ? "title-err" : undefined}
          />
          {fieldErrors.title && (
            <p id="title-err" className="mt-1 text-xs text-rose-600">
              {fieldErrors.title[0]}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="service-description"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Detailed Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="service-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your capabilities, machinery details, operator experience, operator fuel arrangement, and terms..."
          className="w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none"
          aria-describedby={fieldErrors.description ? "desc-err" : undefined}
        />
        {fieldErrors.description && (
          <p id="desc-err" className="mt-1 text-xs text-rose-600">
            {fieldErrors.description[0]}
          </p>
        )}
        <div className="mt-1 text-[11px] text-neutral-400 text-right">
          {description.length} / 3000 characters (min 20)
        </div>
      </div>

      {/* Coverage States */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-neutral-800">
            Coverage States <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllStates}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              Select All 36 States + FCT
            </button>
            <span className="text-neutral-300">|</span>
            <button
              type="button"
              onClick={() => setCoverageStates(["Oyo"])}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-700 underline"
            >
              Reset to Oyo
            </button>
          </div>
        </div>

        <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 flex flex-wrap gap-1.5">
          {NIGERIAN_STATES.map((st) => {
            const isSelected = coverageStates.includes(st);
            return (
              <button
                key={st}
                type="button"
                onClick={() => toggleState(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors min-h-[32px] ${
                  isSelected
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Selected: {coverageStates.length} states
        </p>
        {fieldErrors.coverageStates && (
          <p className="mt-1 text-xs text-rose-600">
            {fieldErrors.coverageStates[0]}
          </p>
        )}
      </div>

      {/* Pricing Model & Base Rate */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="pricing-model"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Pricing Model <span className="text-rose-500">*</span>
          </label>
          <select
            id="pricing-model"
            value={pricingModel}
            onChange={(e) => setPricingModel(e.target.value as PricingModel)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
            aria-describedby={fieldErrors.pricingModel ? "pricing-err" : undefined}
          >
            {PRICING_MODELS.map((model) => (
              <option key={model} value={model}>
                {PRICING_MODEL_LABELS[model]}
              </option>
            ))}
          </select>
          {fieldErrors.pricingModel && (
            <p id="pricing-err" className="mt-1 text-xs text-rose-600">
              {fieldErrors.pricingModel[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="base-rate"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Base Rate (NGN) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-semibold">
              ₦
            </span>
            <input
              id="base-rate"
              type="number"
              min="0"
              step="500"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              placeholder="0 (or specify rate)"
              className="w-full rounded-xl border border-neutral-300 pl-8 pr-4 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              aria-describedby={fieldErrors.baseRate ? "rate-err" : undefined}
            />
          </div>
          <span className="text-[11px] text-neutral-400">
            Enter 0 if pricing is strictly custom quote based.
          </span>
          {fieldErrors.baseRate && (
            <p id="rate-err" className="mt-1 text-xs text-rose-600">
              {fieldErrors.baseRate[0]}
            </p>
          )}
        </div>
      </div>

      {/* Availability Toggle */}
      <div className="pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
          />
          <div>
            <div className="text-xs font-semibold text-neutral-800">
              Service Available for Bookings
            </div>
            <div className="text-xs text-neutral-500">
              Uncheck when fully booked or during equipment maintenance.
            </div>
          </div>
        </label>
      </div>

      {/* Form Submission */}
      <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Service...
            </>
          ) : mode === "create" ? (
            "Publish Service Offering"
          ) : (
            "Update Service"
          )}
        </button>
      </div>
    </form>
  );
}
