import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getClientServiceRequests } from "@/features/services/queries";
import { ServiceRequestStatusBadge } from "@/features/services/components/service-request-status-badge";
import { ServiceRequestLifecycleControls } from "@/features/services/components/service-request-lifecycle-controls";
import { formatNGN } from "@/features/marketplace/constants";
import { Wrench, ArrowLeft, ArrowRight, Calendar, MapPin, ShieldCheck, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Service Bookings & Requests | AgroMarket",
  description: "Track your agricultural service requests, review provider quotes, and manage bookings.",
};

export default async function AccountServiceRequestsPage() {
  await requireAuth();
  const requests = await getClientServiceRequests();

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Account
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Wrench className="h-4 w-4" />
              <span>Farm Operations & Booking</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              My Service Requests
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Manage your agricultural service bookings, accept quotes, and coordinate field fulfillment.
            </p>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
          >
            Browse Services Directory
          </Link>
        </div>

        {/* Service Requests List or Empty State */}
        {requests.length > 0 ? (
          <div className="space-y-6">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Header row: Service Title & Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      {req.service?.title || "Specialized Agricultural Service"}
                    </h2>
                    {req.provider && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-1">
                        <span>Provider: <strong>{req.provider.fullName || "Certified Provider"}</strong></span>
                        {req.provider.isVerified && (
                          <ShieldCheck
                            className="h-3.5 w-3.5 text-emerald-600"
                            aria-label="Verified Provider"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <ServiceRequestStatusBadge status={req.status} />
                </div>

                {/* Details & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100 space-y-2">
                    <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[11px] block">
                      Service Requirements
                    </span>
                    <p className="text-neutral-700 leading-relaxed">
                      {req.details}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100 space-y-2">
                    <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[11px] block flex items-center gap-1">
                      <Lock className="h-3 w-3 text-emerald-700" />
                      Confidential Location & Schedule
                    </span>
                    <div className="text-neutral-700 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>{req.lga}, {req.state}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 pl-4">
                        {req.locationAddress}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>
                          Proposed Date:{" "}
                          <strong>
                            {new Date(req.proposedDate).toLocaleDateString("en-NG", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote Display if provided */}
                {req.quotedAmount !== null && (
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-900">
                      Provider Quote:
                    </span>
                    <span className="text-base font-extrabold text-emerald-900">
                      {formatNGN(req.quotedAmount)}
                    </span>
                  </div>
                )}

                {/* Interactive Lifecycle Controls */}
                <div className="pt-2">
                  <ServiceRequestLifecycleControls
                    requestId={req.id}
                    serviceId={req.serviceId}
                    currentStatus={req.status}
                    userRole="CLIENT"
                    quotedAmount={req.quotedAmount}
                  />
                </div>

                {/* Footer link to public service details */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
                  <span>
                    Requested {new Date(req.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <Link
                    href={`/services/${req.serviceId}`}
                    className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    View Original Listing <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Wrench className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">
              No service requests yet
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
              You haven&apos;t booked any agricultural services yet. Browse our verified service directory to find operators and equipment.
            </p>
            <div className="mt-6">
              <Link
                href="/services"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px]"
              >
                Browse Agricultural Services
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
