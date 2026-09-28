import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getProviderServices, getProviderServiceRequests } from "@/features/services/queries";
import { ServiceRequestStatusBadge } from "@/features/services/components/service-request-status-badge";
import { formatNGN } from "@/features/marketplace/constants";
import {
  Wrench,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  ArrowLeft,
  Inbox,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service Provider Console | AgroMarket",
  description: "Manage your active service listings, equipment availability, and incoming booking requests.",
};

export default async function ServiceProviderDashboardPage() {
  const user = await requireAnyRole(["SERVICE_PROVIDER", "EXPERT", "ADMIN"]);

  const [services, requests] = await Promise.all([
    getProviderServices(user.id),
    getProviderServiceRequests(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
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
              <span>Provider Console</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              Agricultural Services & Bookings
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Welcome back, <strong>{user.fullName || user.email}</strong>. Manage your service offerings and respond to client requests.
            </p>
          </div>

          <Link
            href="/services/provider/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add New Service
          </Link>
        </div>

        {/* SECTION 1: Active Service Offerings */}
        <section aria-labelledby="offerings-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="offerings-heading" className="text-base font-bold text-neutral-900">
              My Service Offerings ({services.length})
            </h2>
          </div>

          {services.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                      {service.serviceCategory}
                    </span>
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
                          Paused
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-neutral-900 line-clamp-1">
                    {service.title}
                  </h3>

                  <div className="text-xs text-neutral-600">
                    Base Rate:{" "}
                    <strong className="text-neutral-900">
                      {service.baseRate > 0 ? formatNGN(service.baseRate) : "Quote-based"}
                    </strong>{" "}
                    ({service.pricingModel.toLowerCase()})
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                    <span className="text-neutral-500">
                      {service.requestsCount ?? 0} total booking{(service.requestsCount ?? 0) === 1 ? "" : "s"}
                    </span>
                    <Link
                      href={`/services/provider/${service.id}`}
                      className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      Edit Service →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
              <p className="text-xs text-neutral-500">
                You have not published any service offerings yet.
              </p>
              <div className="mt-4">
                <Link
                  href="/services/provider/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 min-h-[44px]"
                >
                  <Plus className="h-4 w-4" />
                  List Your First Service
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: Incoming Client Service Requests */}
        <section aria-labelledby="requests-heading" className="space-y-4 pt-4">
          <div>
            <h2 id="requests-heading" className="text-base font-bold text-neutral-900">
              Incoming Client Requests ({requests.length})
            </h2>
            <p className="text-xs text-neutral-500">
              Review requests from farmers, provide quotes, and manage fulfillment.
            </p>
          </div>

          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">
                        {req.service?.title || "Requested Service"}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                        <span>Client: <strong>{req.client?.fullName || "Registered Client"}</strong></span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-neutral-400" />
                          {req.lga}, {req.state}
                        </span>
                      </div>
                    </div>

                    <ServiceRequestStatusBadge status={req.status} />
                  </div>

                  <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100 text-xs text-neutral-700 leading-relaxed">
                    <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[11px] block mb-1">
                      Client Description
                    </span>
                    {req.details}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                    <div className="flex items-center gap-4 text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                        Proposed: {new Date(req.proposedDate).toLocaleDateString("en-NG")}
                      </span>
                      {req.quotedAmount !== null && (
                        <span>
                          Quoted: <strong className="text-neutral-900">{formatNGN(req.quotedAmount)}</strong>
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/services/provider/requests/${req.id}`}
                      className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      Manage Request & Quote <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-2">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-xs text-neutral-500">
                No incoming client requests at the moment. As farmers book your services, requests will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
