"use client";

import Link from "next/link";
import { Users, MapPin, Calendar, ArrowRight } from "lucide-react";
import { formatNGN } from "@/features/marketplace/constants";
import { SharedPurchaseDetail } from "../types";
import { SharedPurchaseProgressBar } from "./shared-purchase-progress-bar";

interface SharedPurchaseCardProps {
  pool: SharedPurchaseDetail;
}

export function SharedPurchaseCard({ pool }: SharedPurchaseCardProps) {
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(pool.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              pool.purchaseType === "ANIMAL_PORTION"
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            }`}
          >
            {pool.purchaseType === "ANIMAL_PORTION"
              ? "Livestock Portion"
              : "Bulk Crop Split"}
          </span>

          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
              pool.status === "OPEN"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                : pool.status === "TARGET_REACHED" || pool.status === "CONFIRMED"
                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {pool.status.replace("_", " ")}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">
            <Link href={`/shared-purchases/${pool.id}`}>{pool.title}</Link>
          </h3>
          {pool.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {pool.description}
            </p>
          )}
        </div>

        {/* Pricing Info */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Wholesale Rate</span>
            <span className="text-lg font-black text-foreground">
              {formatNGN(pool.unitPrice)}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}/ {pool.unit}
              </span>
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Min Share: {pool.minShareQuantity} {pool.unit}</span>
            {pool.remainingQuantity > 0 ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {pool.remainingQuantity} {pool.unit} available
              </span>
            ) : (
              <span className="font-semibold text-amber-600">Fully Allocated</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <SharedPurchaseProgressBar
          allocatedQuantity={pool.allocatedQuantity}
          totalQuantity={pool.totalQuantity}
          unit={pool.unit}
          progressPercent={pool.progressPercent}
          status={pool.status}
        />

        {/* Meta details */}
        <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              Hub: {pool.hubState} ({pool.hubLga})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{pool.currentParticipants} joined</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{daysRemaining} {daysRemaining === 1 ? "day" : "days"} left</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 border-t border-border pt-3">
        <Link
          href={`/shared-purchases/${pool.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          {pool.isJoinable ? "Commit Share" : "View Pool Details"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
