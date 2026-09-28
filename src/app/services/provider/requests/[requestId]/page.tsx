import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getServiceRequestById } from "@/features/services/queries";
import { ServiceRequestStatusBadge } from "@/features/services/components/service-request-status-badge";
import { ServiceRequestLifecycleControls } from "@/features/services/components/service-request-lifecycle-controls";
import { formatNGN } from "@/features/marketplace/constants";
import { ForbiddenError } from "@/lib/errors/app-error";
import {
  Wrench,
  ArrowLeft,
  Calendar,
  MapPin,
  Lock,
  User,
  Phone,
} from "lucide-react";

interface ProviderRequestDetailPageProps {
  params: Promise<{
    requestId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProviderRequestDetailPageProps) {
  const { requestId } = await params;
  const request = await getServiceRequestById(requestId);

  return {
    title: request
      ? `Booking Request: ${request.service?.title || "Service"} | Provider Console`
      : "Service Request | AgroMarket",
  };
}

export default async function ProviderRequestDetailPage({
  params,
}: ProviderRequestDetailPageProps) {
  const { requestId } = await params;
  const user = await requireAnyRole(["SERVICE_PROVIDER", "EXPERT", "ADMIN"]);

  const request = await getServiceRequestById(requestId);
  if (!request) {
    notFound();
  }

  const isProvider = request.providerId === user.id;
  const isAdmin = hasRole(user.roles, "ADMIN");

  if (!isProvider && !isAdmin) {
    throw new ForbiddenError(
      "Unauthorized. You can only view booking requests assigned to your provider profile."
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/services/provider"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Incoming Requests
        </Link>

        {/* Main Request Information Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header Row: Service Title & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <Wrench className="h-4 w-4" />
                <span>{request.service?.serviceCategory || "Agricultural Service"}</span>
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {request.service?.title || "Agricultural Service Booking"}
              </h1>
            </div>
            <ServiceRequestStatusBadge status={request.status} />
          </div>

          {/* Client Information */}
          <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold">
                <User className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold block">
                  Client / Requester
                </span>
                <span className="font-bold text-neutral-900 text-sm">
                  {request.client?.fullName || "Registered AgroMarket Farmer"}
                </span>
              </div>
            </div>

            {request.client?.phone && (
              <div className="flex items-center gap-1.5 text-neutral-700 bg-white px-3 py-1.5 rounded-lg border border-neutral-200">
                <Phone className="h-3.5 w-3.5 text-emerald-700" />
                <span>{request.client.phone}</span>
              </div>
            )}
          </div>

          {/* Service Details Description */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Required Scope & Details
            </h2>
            <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-line bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              {request.details}
            </div>
          </div>

          {/* Confidential Farm Location Details */}
          <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
              <Lock className="h-3.5 w-3.5 text-emerald-700" />
              <span>Confidential Site & Deployment Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-700">
              <div>
                <span className="text-neutral-400 block text-[11px]">Region</span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  {request.lga}, {request.state}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block text-[11px]">Proposed Date</span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  {new Date(request.proposedDate).toLocaleDateString("en-NG", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="sm:col-span-2 pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-400 block text-[11px]">Exact Location / Coordinates</span>
                <span className="font-semibold text-neutral-900 mt-0.5 block">
                  {request.locationAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Current Quote if set */}
          {request.quotedAmount !== null && (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">
                  Submitted Quote Amount
                </span>
                <span className="text-xs text-emerald-700">
                  Awaiting client confirmation or accepted
                </span>
              </div>
              <span className="text-xl font-extrabold text-emerald-900">
                {formatNGN(request.quotedAmount)}
              </span>
            </div>
          )}

          {/* Lifecycle Action Controls */}
          <div className="pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              Request Actions & Fulfillment
            </h2>
            <ServiceRequestLifecycleControls
              requestId={request.id}
              serviceId={request.serviceId}
              currentStatus={request.status}
              userRole="PROVIDER"
              quotedAmount={request.quotedAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
