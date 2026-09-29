import Link from "next/link";
import {
  EquipmentListing,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CONDITION_LABELS,
} from "../types";
import { formatNGN } from "@/features/marketplace/constants";
import {
  MapPin,
  ShieldCheck,
  ArrowRight,
  Tractor,
  CheckCircle2,
  XCircle,
  UserCheck,
  Star,
} from "lucide-react";

interface EquipmentCardProps {
  equipment: EquipmentListing;
  showAvailabilityBadge?: boolean;
}

export function EquipmentCard({
  equipment,
  showAvailabilityBadge = true,
}: EquipmentCardProps) {
  const categoryLabel =
    EQUIPMENT_CATEGORY_LABELS[equipment.category] || equipment.category;
  const conditionLabel =
    EQUIPMENT_CONDITION_LABELS[equipment.condition] || equipment.condition;

  return (
    <div className="group flex flex-col rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Card Header: Category & Availability */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 bg-neutral-50/60 rounded-t-xl">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          <Tractor className="h-3.5 w-3.5 text-emerald-700" />
          {categoryLabel}
        </span>
        {showAvailabilityBadge && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
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
          href={`/equipment/${equipment.id}`}
          className="font-bold text-base text-neutral-900 transition-colors group-hover:text-emerald-700 line-clamp-1 leading-snug"
        >
          {equipment.name}
        </Link>

        {/* Make, Model & Year */}
        {(equipment.makeModel || equipment.yearManufactured) && (
          <p className="mt-1 text-xs text-neutral-500">
            {[equipment.makeModel, equipment.yearManufactured]
              .filter(Boolean)
              .join(" • ")}
          </p>
        )}

        {/* Condition & Operator Tags */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
            {conditionLabel}
          </span>
          {equipment.operatorIncluded && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
              <UserCheck className="h-3 w-3 text-amber-600" />
              Operator Included
            </span>
          )}
        </div>

        {/* Location */}
        <div className="mt-3 flex items-center text-xs text-neutral-600">
          <MapPin className="mr-1 h-3.5 w-3.5 text-neutral-400 shrink-0" />
          <span className="truncate">
            {equipment.locationLga}, {equipment.locationState} State
          </span>
        </div>

        {/* Safe Owner Profile Display (No private PII!) */}
        {equipment.owner && (
          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {equipment.owner.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={equipment.owner.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-neutral-200"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold ring-1 ring-emerald-200">
                  {equipment.owner.fullName?.charAt(0) || "O"}
                </div>
              )}
              <span className="text-xs font-medium text-neutral-700 truncate max-w-[120px]">
                {equipment.owner.fullName || "Equipment Owner"}
              </span>
              {equipment.owner.isVerified && (
                <span title="Verified Equipment Owner">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </span>
              )}
            </div>

            {/* Optional review rating */}
            {equipment.reviewStats && equipment.reviewStats.totalReviews > 0 && (
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>{equipment.reviewStats.averageRating.toFixed(1)}</span>
                <span className="text-neutral-400 font-normal">
                  ({equipment.reviewStats.totalReviews})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pricing & CTA Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Daily Rental</div>
            <div className="text-base font-extrabold text-neutral-900">
              {formatNGN(equipment.dailyRentalRate)}{" "}
              <span className="text-xs font-normal text-neutral-500">/ day</span>
            </div>
            {equipment.cautionDeposit > 0 && (
              <div className="text-[11px] text-neutral-400">
                Deposit: {formatNGN(equipment.cautionDeposit)}
              </div>
            )}
          </div>

          <Link
            href={`/equipment/${equipment.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 min-h-[40px]"
          >
            <span>View & Rent</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
