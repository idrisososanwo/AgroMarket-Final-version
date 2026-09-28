import Link from "next/link";
import {
  ServiceListing,
  SERVICE_CATEGORY_LABELS,
  PRICING_MODEL_LABELS,
} from "../types";
import { formatNGN } from "@/features/marketplace/constants";
import { MapPin, ShieldCheck, ArrowRight, Wrench, CheckCircle2, XCircle } from "lucide-react";

interface ServiceCardProps {
  service: ServiceListing;
  showAvailabilityBadge?: boolean;
}

export function ServiceCard({
  service,
  showAvailabilityBadge = true,
}: ServiceCardProps) {
  const categoryLabel =
    SERVICE_CATEGORY_LABELS[service.serviceCategory] || service.serviceCategory;
  const pricingLabel =
    PRICING_MODEL_LABELS[service.pricingModel] || service.pricingModel;

  // Format coverage states for compact display
  const displayedStates = service.coverageStates.slice(0, 3);
  const remainingStatesCount = service.coverageStates.length - 3;

  return (
    <div className="group flex flex-col rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Card Header: Category & Availability */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 bg-neutral-50/60 rounded-t-xl">
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          <Wrench className="h-3 w-3 text-emerald-700" />
          {categoryLabel}
        </span>
        {showAvailabilityBadge && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
              service.isAvailable
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-neutral-100 text-neutral-600 border-neutral-200"
            }`}
          >
            {service.isAvailable ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Available
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 text-neutral-500" />
                Unavailable
              </>
            )}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title Link */}
        <Link
          href={`/services/${service.id}`}
          className="font-bold text-base text-neutral-900 transition-colors group-hover:text-emerald-700 line-clamp-2 leading-snug"
        >
          {service.title}
        </Link>

        {/* Safe Provider Profile Display */}
        {service.provider && (
          <div className="mt-2.5 flex items-center gap-2">
            {service.provider.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={service.provider.avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full object-cover ring-1 ring-neutral-200"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold ring-1 ring-emerald-200">
                {service.provider.fullName
                  ? service.provider.fullName.charAt(0).toUpperCase()
                  : "P"}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs font-medium text-neutral-800 truncate">
              <span className="truncate">
                {service.provider.fullName || "Registered Provider"}
              </span>
              {service.provider.isVerified && (
                <ShieldCheck
                  className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                  aria-label="Verified Provider"
                />
              )}
            </div>
            {service.provider.state && (
              <span className="text-xs text-neutral-500 ml-auto flex items-center">
                <MapPin className="mr-0.5 h-3 w-3 text-neutral-400" />
                {service.provider.state}
              </span>
            )}
          </div>
        )}

        {/* Description snippet */}
        <p className="mt-2.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
          {service.description}
        </p>

        {/* Coverage States Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-500 font-medium">Coverage:</span>
          {displayedStates.length > 0 ? (
            <>
              {displayedStates.map((st) => (
                <span
                  key={st}
                  className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-700"
                >
                  {st}
                </span>
              ))}
              {remainingStatesCount > 0 && (
                <span className="text-[11px] text-neutral-500 font-medium">
                  +{remainingStatesCount} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-neutral-500 italic">Nationwide</span>
          )}
        </div>

        {/* Pricing Model & Base Rate */}
        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500">{pricingLabel}</div>
            <div className="text-sm font-bold text-neutral-900">
              {service.baseRate > 0 ? (
                <>
                  {formatNGN(service.baseRate)}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    {service.pricingModel === "PER_HECTARE"
                      ? "/ hectare"
                      : service.pricingModel === "PER_HOUR"
                      ? "/ hour"
                      : "starting rate"}
                  </span>
                </>
              ) : (
                <span className="text-emerald-700">Custom Quote</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Link */}
      <div className="border-t border-neutral-100 px-4 py-2.5 bg-neutral-50/40 rounded-b-xl flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          {service.requestsCount !== undefined
            ? `${service.requestsCount} ${
                service.requestsCount === 1 ? "booking" : "bookings"
              }`
            : "Direct Provider Service"}
        </span>
        <Link
          href={`/services/${service.id}`}
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          View Service <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
