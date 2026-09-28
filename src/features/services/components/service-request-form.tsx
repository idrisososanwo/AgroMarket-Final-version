"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createServiceRequestAction } from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Lock, AlertCircle, CheckCircle2, Calendar, MapPin, Loader2 } from "lucide-react";

interface ServiceRequestFormProps {
  serviceId: string;
  serviceTitle: string;
  providerName?: string | null;
  onSuccess?: (requestId: string) => void;
}

export function ServiceRequestForm({
  serviceId,
  serviceTitle,
  providerName,
  onSuccess,
}: ServiceRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [details, setDetails] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [proposedDate, setProposedDate] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side quick validation
    const errors: Record<string, string[]> = {};
    if (!details || details.trim().length < 10) {
      errors.details = ["Please provide at least 10 characters describing the required service."];
    }
    if (!state) {
      errors.state = ["State of operation is required."];
    }
    if (!lga || lga.trim().length < 2) {
      errors.lga = ["Local Government Area (LGA) is required."];
    }
    if (!locationAddress || locationAddress.trim().length < 5) {
      errors.locationAddress = ["Detailed farm or site address is required."];
    }
    if (!proposedDate) {
      errors.proposedDate = ["Proposed service date is required."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createServiceRequestAction({
          serviceId,
          details,
          state,
          lga,
          locationAddress,
          proposedDate,
        });

        if (!result.success) {
          setGeneralError(result.error || "Failed to submit request.");
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          return;
        }

        const newId = result.data?.requestId;
        if (newId) {
          setSubmittedRequestId(newId);
          if (onSuccess) {
            onSuccess(newId);
          } else {
            router.refresh();
          }
        }
      } catch (err: unknown) {
        setGeneralError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  if (submittedRequestId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-neutral-900">
          Service Request Submitted!
        </h3>
        <p className="mt-2 text-sm text-neutral-600 max-w-md mx-auto">
          Your request for <span className="font-semibold text-neutral-800">{serviceTitle}</span> has
          been sent directly to {providerName || "the service provider"}. They will review your
          details and provide a quote or confirmation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/services/requests")}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors min-h-[44px]"
          >
            View My Requests
          </button>
          <button
            type="button"
            onClick={() => {
              setSubmittedRequestId(null);
              setDetails("");
              setState("");
              setLga("");
              setLocationAddress("");
              setProposedDate("");
            }}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
    >
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Book / Request Service</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Submitting request for:{" "}
          <span className="font-semibold text-neutral-800">{serviceTitle}</span>
          {providerName && ` by ${providerName}`}
        </p>
      </div>

      {generalError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Service Details */}
      <div>
        <label
          htmlFor="request-details"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Service Requirements & Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="request-details"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe your requirements (e.g. land size, soil condition, specific machinery needed, preferred schedule)..."
          className="w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          aria-describedby={fieldErrors.details ? "details-error" : undefined}
        />
        {fieldErrors.details && (
          <p id="details-error" className="mt-1 text-xs text-rose-600">
            {fieldErrors.details[0]}
          </p>
        )}
        <div className="mt-1 text-[11px] text-neutral-400 text-right">
          {details.length} / 2000 characters
        </div>
      </div>

      {/* Proposed Date */}
      <div>
        <label
          htmlFor="proposed-date"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Proposed Service Date <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            id="proposed-date"
            type="date"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            aria-describedby={fieldErrors.proposedDate ? "date-error" : undefined}
          />
        </div>
        {fieldErrors.proposedDate && (
          <p id="date-error" className="mt-1 text-xs text-rose-600">
            {fieldErrors.proposedDate[0]}
          </p>
        )}
      </div>

      {/* State & LGA Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="state-input"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            State <span className="text-rose-500">*</span>
          </label>
          <select
            id="state-input"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            aria-describedby={fieldErrors.state ? "state-error" : undefined}
          >
            <option value="">Select State</option>
            {NIGERIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          {fieldErrors.state && (
            <p id="state-error" className="mt-1 text-xs text-rose-600">
              {fieldErrors.state[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="lga-input"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Local Government Area (LGA) <span className="text-rose-500">*</span>
          </label>
          <input
            id="lga-input"
            type="text"
            value={lga}
            onChange={(e) => setLga(e.target.value)}
            placeholder="e.g. Ibeju-Lekki, Chikun, Ogbomoso"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            aria-describedby={fieldErrors.lga ? "lga-error" : undefined}
          />
          {fieldErrors.lga && (
            <p id="lga-error" className="mt-1 text-xs text-rose-600">
              {fieldErrors.lga[0]}
            </p>
          )}
        </div>
      </div>

      {/* Exact Location Address with Privacy Notice */}
      <div>
        <label
          htmlFor="location-address"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Exact Farm / Site Address <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          <textarea
            id="location-address"
            rows={2}
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            placeholder="Detailed physical address, farm coordinates, or landmark descriptions..."
            className="w-full rounded-xl border border-neutral-300 pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            aria-describedby={fieldErrors.locationAddress ? "address-error" : undefined}
          />
        </div>
        {fieldErrors.locationAddress && (
          <p id="address-error" className="mt-1 text-xs text-rose-600">
            {fieldErrors.locationAddress[0]}
          </p>
        )}

        {/* Clear Privacy Notice */}
        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-neutral-50 p-3 border border-neutral-200 text-xs text-neutral-600">
          <Lock className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-800">
              Privacy Protection Guaranteed:
            </span>{" "}
            Your exact site address is kept strictly confidential. It is shared only
            with the verified service provider fulfilling this booking and will never be
            displayed on public pages or search results.
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Request...
            </>
          ) : (
            "Submit Service Request"
          )}
        </button>
      </div>
    </form>
  );
}
