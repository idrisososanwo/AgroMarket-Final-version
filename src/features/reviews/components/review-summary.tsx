import { ReviewStats } from "../types";
import { Star } from "lucide-react";

interface ReviewSummaryProps {
  stats?: ReviewStats | null;
  className?: string;
}

export function ReviewSummary({ stats, className = "" }: ReviewSummaryProps) {
  if (!stats || stats.totalReviews === 0) {
    return (
      <div
        className={`rounded-2xl border border-neutral-200 bg-white p-6 text-center ${className}`}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Star className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-neutral-800">No reviews yet</h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-xs mx-auto">
          Ratings and feedback from verified clients and buyers will appear here after
          service completion.
        </p>
      </div>
    );
  }

  const { averageRating, totalReviews, ratingDistribution } = stats;
  const ratingStars = [5, 4, 3, 2, 1] as const;

  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm ${className}`}
      aria-label="Customer Reviews Summary"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        {/* Left Column: Big Average & Stars */}
        <div className="text-center md:col-span-4 md:border-r md:border-neutral-100 md:pr-6">
          <div className="text-4xl font-extrabold text-neutral-900 tracking-tight">
            {averageRating.toFixed(1)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(averageRating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-neutral-100 text-neutral-300"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Right Column: 1–5 Star Rating Distribution Bars */}
        <div className="space-y-2 md:col-span-8 md:pl-2">
          {ratingStars.map((star) => {
            const count = ratingDistribution[star] || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

            return (
              <div
                key={star}
                className="flex items-center gap-3 text-xs"
                role="group"
                aria-label={`${star} star reviews: ${count} (${percentage}%)`}
              >
                <div className="flex w-12 items-center gap-1 text-neutral-600 font-medium shrink-0">
                  <span>{star}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                </div>

                <div
                  className="relative h-2 flex-1 rounded-full bg-neutral-100 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="w-12 text-right text-neutral-500 tabular-nums shrink-0">
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
