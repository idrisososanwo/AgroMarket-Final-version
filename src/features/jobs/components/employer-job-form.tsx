"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  JobCategory,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  EmploymentType,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  CompensationType,
  COMPENSATION_TYPES,
  COMPENSATION_TYPE_LABELS,
  JobListing,
} from "../types";
import { createJobAction, updateJobAction } from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface EmployerJobFormProps {
  initialData?: JobListing;
  mode: "create" | "edit";
  onSuccessRedirect?: string;
}

export function EmployerJobForm({
  initialData,
  mode = "create",
  onSuccessRedirect = "/farmer/jobs",
}: EmployerJobFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState<JobCategory>(
    initialData?.category || "CASUAL_LABOUR"
  );
  const [state, setState] = useState(initialData?.state || "Oyo");
  const [lga, setLga] = useState(initialData?.lga || "");
  const [locationDetails, setLocationDetails] = useState(
    initialData?.locationDetails || ""
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initialData?.employmentType || "FULL_TIME"
  );
  const [compensationType, setCompensationType] = useState<CompensationType>(
    initialData?.compensationType || "MONTHLY"
  );
  const [compensationAmount, setCompensationAmount] = useState(
    initialData?.compensationAmount !== undefined
      ? initialData.compensationAmount.toString()
      : ""
  );
  const [requirements, setRequirements] = useState(
    initialData?.requirements || ""
  );
  const [deadline, setDeadline] = useState(
    initialData?.deadline
      ? new Date(initialData.deadline).toISOString().split("T")[0]
      : ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const response = await createJobAction({
          title,
          description,
          category,
          state,
          lga,
          locationDetails: locationDetails || null,
          employmentType,
          compensationType,
          compensationAmount: Number(compensationAmount) || 0,
          requirements: requirements || null,
          deadline: deadline || null,
          status: "ACTIVE",
        });

        if (!response.success) {
          setErrorMessage(response.error || "Failed to create job placement.");
          if (response.fieldErrors) setFieldErrors(response.fieldErrors);
        } else {
          setIsSuccess(true);
          router.push(onSuccessRedirect);
          router.refresh();
        }
      } else if (mode === "edit" && initialData) {
        const response = await updateJobAction({
          jobId: initialData.id,
          title,
          description,
          category,
          state,
          lga,
          locationDetails: locationDetails || null,
          employmentType,
          compensationType,
          compensationAmount: Number(compensationAmount) || 0,
          requirements: requirements || null,
          deadline: deadline || null,
        });

        if (!response.success) {
          setErrorMessage(response.error || "Failed to update job placement.");
          if (response.fieldErrors) setFieldErrors(response.fieldErrors);
        } else {
          setIsSuccess(true);
          router.push(onSuccessRedirect);
          router.refresh();
        }
      }
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6"
    >
      <div>
        <h2 className="text-lg font-bold text-neutral-900">
          {mode === "create" ? "Post New Agricultural Job" : "Edit Job Listing"}
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          {mode === "create"
            ? "Publish a placement for farm hands, harvest crews, agronomists, or tractor operators."
            : "Update role specifications, requirements, and compensation terms."}
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSuccess && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>Job saved successfully. Redirecting...</span>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-xs font-semibold text-neutral-800 mb-1">
          Job Position Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Senior Tractor Operator for Rice Harvest"
          required
          maxLength={150}
          className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
        />
        {fieldErrors.title && (
          <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.title[0]}</p>
        )}
      </div>

      {/* Category & Employment Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-xs font-semibold text-neutral-800 mb-1">
            Agricultural Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as JobCategory)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          >
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {JOB_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="employmentType" className="block text-xs font-semibold text-neutral-800 mb-1">
            Employment Type <span className="text-rose-500">*</span>
          </label>
          <select
            id="employmentType"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-neutral-800 mb-1">
          Role Description & Duties <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          maxLength={5000}
          placeholder="Detail the daily responsibilities, crops, machinery, farm acreage, and team structure..."
          className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        {fieldErrors.description && (
          <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.description[0]}</p>
        )}
      </div>

      {/* State & LGA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="state" className="block text-xs font-semibold text-neutral-800 mb-1">
            Farm Location State <span className="text-rose-500">*</span>
          </label>
          <select
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          >
            {NIGERIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lga" className="block text-xs font-semibold text-neutral-800 mb-1">
            LGA <span className="text-rose-500">*</span>
          </label>
          <input
            id="lga"
            type="text"
            value={lga}
            onChange={(e) => setLga(e.target.value)}
            placeholder="e.g. Iseyin, Argungu, Idanre"
            required
            maxLength={50}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          />
          {fieldErrors.lga && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.lga[0]}</p>
          )}
        </div>
      </div>

      {/* Location Details */}
      <div>
        <label htmlFor="locationDetails" className="block text-xs font-semibold text-neutral-800 mb-1">
          Farm Location Details <span className="text-neutral-400 font-normal">(Optional landmark / farm cluster)</span>
        </label>
        <input
          id="locationDetails"
          type="text"
          value={locationDetails}
          onChange={(e) => setLocationDetails(e.target.value)}
          placeholder="e.g. Near Farm Settlement Gate 2, Off Old Ibadan Expressway"
          maxLength={255}
          className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
        />
      </div>

      {/* Compensation Amount & Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="compensationAmount" className="block text-xs font-semibold text-neutral-800 mb-1">
            Compensation Amount (NGN) <span className="text-rose-500">*</span>
          </label>
          <input
            id="compensationAmount"
            type="number"
            value={compensationAmount}
            onChange={(e) => setCompensationAmount(e.target.value)}
            placeholder="e.g. 150000"
            min={0}
            step={500}
            required
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          />
          {fieldErrors.compensationAmount && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.compensationAmount[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="compensationType" className="block text-xs font-semibold text-neutral-800 mb-1">
            Payment Frequency <span className="text-rose-500">*</span>
          </label>
          <select
            id="compensationType"
            value={compensationType}
            onChange={(e) => setCompensationType(e.target.value as CompensationType)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          >
            {COMPENSATION_TYPES.map((c) => (
              <option key={c} value={c}>
                {COMPENSATION_TYPE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirements & Deadline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="requirements" className="block text-xs font-semibold text-neutral-800 mb-1">
            Requirements / Qualifications <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="requirements"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={3}
            maxLength={3000}
            placeholder="e.g. 3 years tractor operation experience, valid driver license, physically fit"
            className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label htmlFor="deadline" className="block text-xs font-semibold text-neutral-800 mb-1">
            Application Deadline <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[44px]"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition min-h-[44px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Job...</span>
            </>
          ) : (
            <span>{mode === "create" ? "Publish Placement" : "Update Job"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
