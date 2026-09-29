import { notFound } from "next/navigation";
import Link from "next/link";
import { getEquipmentById } from "@/features/equipment/queries";
import { getReviews } from "@/features/reviews/queries";
import { getCurrentUser } from "@/lib/auth/server";
import { EquipmentBookingForm } from "@/features/equipment/components/equipment-booking-form";
import { ReviewSummary } from "@/features/reviews/components/review-summary";
import { ReviewList } from "@/features/reviews/components/review-list";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CONDITION_LABELS,
} from "@/features/equipment/types";
import { formatNGN } from "@/features/marketplace/constants";
import {
  MapPin,
  ShieldCheck,
  Tractor,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserCheck,
  Cog,
  FileText,
  Shield,
} from "lucide-react";

interface EquipmentDetailPageProps {
  params: Promise<{
    equipmentId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: EquipmentDetailPageProps) {
  const { equipmentId } = await params;
  const equipment = await getEquipmentById(equipmentId);

  if (!equipment) {
    return {
      title: "Equipment Not Found | AgroMarket",
    };
  }

  const categoryLabel =
    EQUIPMENT_CATEGORY_LABELS[equipment.category] || equipment.category;

  return {
    title: `${equipment.name} (${categoryLabel}) | AgroMarket Equipment`,
    description: `Rent ${equipment.name} in ${equipment.locationLga}, ${equipment.locationState} State. Flexible daily rates with escrow deposit protection.`,
  };
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const { equipmentId } = await params;

  const [equipment, currentUser, reviewsResult] = await Promise.all([
    getEquipmentById(equipmentId),
    getCurrentUser(),
    getReviews({ equipmentId, limit: 10 }),
  ]);

  if (!equipment) {
    notFound();
  }

  const categoryLabel =
    EQUIPMENT_CATEGORY_LABELS[equipment.category] || equipment.category;
  const conditionLabel =
    EQUIPMENT_CONDITION_LABELS[equipment.condition] || equipment.condition;

  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/equipment" className="hover:text-neutral-900 transition-colors">
            Equipment Rental
          </Link>
          <span>/</span>
          <span className="text-emerald-700 truncate max-w-xs">{equipment.name}</span>
        </div>

        {/* Back Link */}
        <div>
          <Link
            href="/equipment"
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Equipment Catalog
          </Link>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Status Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                  <Tractor className="h-3.5 w-3.5 text-emerald-700" />
                  {categoryLabel}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    equipment.isAvailable && equipment.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200"
                  }`}
                >
                  {equipment.isAvailable && equipment.status === "ACTIVE" ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Available Now
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-neutral-500" />
                      Currently Unavailable
                    </>
                  )}
                </span>

                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                  {conditionLabel}
                </span>

                {equipment.operatorIncluded && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    <UserCheck className="h-3 w-3 text-amber-600" />
                    Operator Included
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                {equipment.name}
              </h1>

              <div className="flex items-center text-xs sm:text-sm text-neutral-600">
                <MapPin className="mr-1.5 h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Machine Base: <strong>{equipment.locationLga}</strong>,{" "}
                  <strong>{equipment.locationState} State</strong>, Nigeria
                </span>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
                <Cog className="h-4 w-4 text-emerald-700" />
                Machinery Specifications
              </h2>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="rounded-lg bg-neutral-50 p-3">
                  <dt className="text-neutral-500 font-medium">Make & Model</dt>
                  <dd className="mt-1 font-bold text-neutral-900 text-sm">
                    {equipment.makeModel || "Standard Implements"}
                  </dd>
                </div>

                <div className="rounded-lg bg-neutral-50 p-3">
                  <dt className="text-neutral-500 font-medium">Manufacture Year</dt>
                  <dd className="mt-1 font-bold text-neutral-900 text-sm">
                    {equipment.yearManufactured || "N/A"}
                  </dd>
                </div>

                <div className="rounded-lg bg-neutral-50 p-3">
                  <dt className="text-neutral-500 font-medium">Machine Condition</dt>
                  <dd className="mt-1 font-bold text-neutral-900 text-sm">
                    {equipment.condition}
                  </dd>
                </div>

                <div className="rounded-lg bg-neutral-50 p-3">
                  <dt className="text-neutral-500 font-medium">Daily Rental Rate</dt>
                  <dd className="mt-1 font-bold text-emerald-700 text-sm">
                    {formatNGN(equipment.dailyRentalRate)} / day
                  </dd>
                </div>

                <div className="rounded-lg bg-neutral-50 p-3">
                  <dt className="text-neutral-500 font-medium">Caution Deposit</dt>
                  <dd className="mt-1 font-bold text-neutral-900 text-sm">
                    {formatNGN(equipment.cautionDeposit)}
                  </dd>
                </div>

                <div className="rounded-lg bg-neutral-50 p-3">
                  <dt className="text-neutral-500 font-medium">Operator Policy</dt>
                  <dd className="mt-1 font-bold text-neutral-900 text-sm">
                    {equipment.operatorIncluded ? "Included with Hire" : "Self-Operate"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description & Operating Details */}
            {equipment.description && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-700" />
                  Description & Operating Terms
                </h2>
                <div className="text-xs sm:text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
                  {equipment.description}
                </div>
              </div>
            )}

            {/* Safe Equipment Owner Information Card (STRICTLY NO PII) */}
            {equipment.owner && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  Verified Equipment Owner
                </h2>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {equipment.owner.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={equipment.owner.avatarUrl}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-600/20"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-base font-bold ring-2 ring-emerald-600/20">
                        {equipment.owner.fullName?.charAt(0) || "O"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900">
                        <span>{equipment.owner.fullName || "Equipment Owner"}</span>
                        {equipment.owner.isVerified && (
                          <span title="Government or Identity Verified Equipment Owner">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Based in {equipment.owner.lga ? `${equipment.owner.lga}, ` : ""}{equipment.owner.state || "Nigeria"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 text-xs text-emerald-900">
                    <span className="font-semibold flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-700" />
                      AgroMarket Escrow Guaranteed
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      Payment and deposit remain protected until machine handover inspection.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Reviews & Ratings */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100">
                Machine Performance & Rental Reviews
              </h2>

              {reviewsResult.stats && reviewsResult.stats.totalReviews > 0 ? (
                <>
                  <ReviewSummary stats={reviewsResult.stats} />
                  <ReviewList reviews={reviewsResult.reviews} />
                </>
              ) : (
                <div className="py-6 text-center text-xs text-neutral-500">
                  No renter reviews yet for this equipment. Be the first to rent and review!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <EquipmentBookingForm
                equipment={equipment}
                currentUserId={currentUser?.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
