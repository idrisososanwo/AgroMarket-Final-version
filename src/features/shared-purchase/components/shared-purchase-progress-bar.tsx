"use client";

interface SharedPurchaseProgressBarProps {
  allocatedQuantity: number;
  totalQuantity: number;
  unit: string;
  progressPercent: number;
  status: string;
}

export function SharedPurchaseProgressBar({
  allocatedQuantity,
  totalQuantity,
  unit,
  progressPercent,
  status,
}: SharedPurchaseProgressBarProps) {
  const isTargetReached = progressPercent >= 100 || status === "TARGET_REACHED" || status === "CONFIRMED";

  let barColor = "bg-emerald-600";
  if (status === "CANCELLED" || status === "EXPIRED") {
    barColor = "bg-gray-400";
  } else if (isTargetReached) {
    barColor = "bg-amber-500";
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {allocatedQuantity.toLocaleString()} / {totalQuantity.toLocaleString()} {unit} committed
        </span>
        <span className="font-semibold text-foreground">
          {progressPercent}%
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-500 rounded-full ${barColor}`}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>

      {isTargetReached && status !== "CANCELLED" && (
        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
          🎯 Target quantity 100% committed!
        </p>
      )}
    </div>
  );
}
