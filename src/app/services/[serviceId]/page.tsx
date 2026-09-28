import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceById } from "@/features/services/queries";
import { getServiceReviews } from "@/features/reviews/queries";
import { getCurrentUser } from "@/lib/auth/server";
import { ServiceRequestForm } from "@/features/services/components/service-request-form";
import { ReviewSummary } from "@/features/reviews/components/review-summary";
import { ReviewList } from "@/features/reviews/components/review-list";
import {
  SERVICE_CATEGORY_LABELS,
  PRICING_MODEL_LABELS,
} from "@/features/services/types";
import { formatNGN } from "@/features/marketplace/constants";
import {
  MapPin,
  ShieldCheck,
  Wrench,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";

interface ServiceDetailPageProps {
  params: Promise<{
    serviceId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ServiceDetailPageProps) {
  const { serviceId } = await params;
  const service = await getServiceById(serviceId);

  if (!service) {
    return {
      title: "Service Not Found | AgroMarket",
    };
  }

  const categoryLabel = SERVICE_CATEGORY_LABELS[service.serviceCategory] || service.serviceCategory;
  return {
    title: `${service.title} (${categoryLabel}) | AgroMarket Services`,
    description: `Book agricultural service: ${service.title}. Available across ${service.coverageStates.join(", ")}.`,
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { serviceId } = await params;
  const [service, currentUser, reviewsResult] = await Promise.all([
    getServiceById(serviceId),
    getCurrentUser(),
    getServiceReviews(serviceId, 1, 10),
  ]);

  if (!service) {
    notFound();
  }

  const categoryLabel = SERVICE_CATEGORY_LABELS[service.serviceCategory] || service.serviceCategory;
  const pricingLabel = PRICING_MODEL_LABELS[service.pricingModel] || service.pricingModel;

  const isProviderOwner = currentUser?.id === service.providerId;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/services"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to All Services
        </Link>

        {/* Main Service Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              <Wrench className="h-3.5 w-3.5 text-emerald-700" />
              {categoryLabel}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold border ${
                service.isAvailable
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-neutral-100 text-neutral-600 border-neutral-200"
              }`}
            >
              {service.isAvailable ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Available for Booking
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-neutral-500" />
                  Currently Unavailable
                </>
              )}
            </span>
          </div>

          {/* Title & Safe Provider */}
          <div className="mt-5">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {service.title}
            </h1>

            {service.provider && (
              <div className="mt-3 flex items-center gap-3">
                {service.provider.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.provider.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-200"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold ring-1 ring-emerald-200">
                    {service.provider.fullName
                      ? service.provider.fullName.charAt(0).toUpperCase()
                      : "P"}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-neutral-900">
                      {service.provider.fullName || "Verified Agricultural Provider"}
                    </span>
                    {service.provider.isVerified && (
                      <ShieldCheck
                        className="h-4 w-4 text-emerald-600 shrink-0"
                        aria-label="Verified Provider"
                      />
                    )}
                  </div>
                  {service.provider.state && (
                    <span className="text-xs text-neutral-500 flex items-center mt-0.5">
                      <MapPin className="mr-1 h-3 w-3 text-neutral-400" />
                      {service.provider.lga
                        ? `${service.provider.lga}, ${service.provider.state}`
                        : service.provider.state}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Rate Information */}
          <div className="mt-6 rounded-xl bg-neutral-50 p-4 border border-neutral-100 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                {pricingLabel}
              </span>
              <div className="text-base sm:text-lg font-extrabold text-neutral-900">
                {service.baseRate > 0 ? (
                  <>
                    {formatNGN(service.baseRate)}{" "}
                    <span className="text-xs font-normal text-neutral-500">
                      {service.pricingModel === "PER_HECTARE"
                        ? "/ hectare"
                        : service.pricingModel === "PER_HOUR"
                        ? "/ hour"
                        : "base rate"}
                    </span>
                  </>
                ) : (
                  <span className="text-emerald-700">Custom Assessment / Quote Based</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Service Capabilities & Scope
            </h2>
            <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {service.description}
            </div>
          </div>

          {/* Coverage States */}
          <div className="mt-8 border-t border-neutral-100 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Geographic Coverage
            </h2>
            <div className="flex flex-wrap gap-2">
              {service.coverageStates.map((st) => (
                <span
                  key={st}
                  className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 border border-neutral-200"
                >
                  {st}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Form or Action Section */}
        <section aria-labelledby="booking-heading">
          {!service.isAvailable ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-sm font-bold text-neutral-800">
                Service Unavailable
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                This service offering is currently unavailable for new bookings.
              </p>
            </div>
          ) : isProviderOwner ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  You are the provider for this service
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Update service offerings or review client booking requests in your provider console.
                </p>
              </div>
              <Link
                href={`/services/provider/${service.id}`}
                className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
              >
                Edit Service Listing
              </Link>
            </div>
          ) : !currentUser ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Sign In to Request Service
                </h3>
                <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                  To book this service or request a formal quote for your farm, please log in to your account.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href={`/login?redirect=/services/${service.id}`}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] flex items-center justify-center"
                >
                  Log In to Request Service
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <ServiceRequestForm
              serviceId={service.id}
              serviceTitle={service.title}
              providerName={service.provider?.fullName}
            />
          )}
        </section>

        {/* Verified Reviews Section */}
        <section aria-labelledby="reviews-heading" className="space-y-6 pt-4">
          <div>
            <h2 id="reviews-heading" className="text-lg font-bold text-neutral-900">
              Verified Client Reviews & Ratings
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Honest feedback from farmers and clients who completed bookings with this service provider.
            </p>
          </div>

          <ReviewSummary stats={reviewsResult.stats} />

          <ReviewList
            reviews={reviewsResult.reviews}
            totalCount={reviewsResult.totalCount}
            currentPage={reviewsResult.page}
            totalPages={reviewsResult.totalPages}
            emptyMessage="No reviews recorded for this service yet. Completed bookings will show verified client ratings here."
          />
        </section>
      </div>
    </div>
  );
}
