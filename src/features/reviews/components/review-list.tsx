import { Review } from "../types";
import { Star, ShieldCheck, User, ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewListProps {
  reviews: Review[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  className?: string;
}

export function ReviewList({
  reviews,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  emptyMessage = "No reviews yet. Be the first to share your experience!",
  className = "",
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-neutral-200 bg-white p-8 text-center ${className}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Star className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-neutral-800">
          No Reviews Found
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {totalCount !== undefined && (
        <div className="text-xs text-neutral-500 font-medium px-1">
          Showing {reviews.length} of {totalCount} reviews
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((review) => {
          const authorName = review.author?.fullName || "Verified User";
          const formattedDate = new Date(review.createdAt).toLocaleDateString(
            "en-NG",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          );

          return (
            <article
              key={review.id}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3"
            >
              {/* Header: Author Info & Rating */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Safe Avatar */}
                  {review.author?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.author.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-900">
                        {authorName}
                      </span>
                      {review.isVerifiedTransaction && (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                          title="Confirmed booking or completed order"
                        >
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </div>
                    {review.author?.state && (
                      <span className="text-[11px] text-neutral-500">
                        {review.author.lga
                          ? `${review.author.lga}, ${review.author.state}`
                          : review.author.state}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stars and Date */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`Rating: ${review.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-neutral-100 text-neutral-200"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <time
                    dateTime={review.createdAt}
                    className="text-xs text-neutral-500"
                  >
                    {formattedDate}
                  </time>
                </div>
              </div>

              {/* Review Comment */}
              {review.comment && (
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed pl-11">
                  {review.comment}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages && totalPages > 1 && currentPage && (
        <div className="flex items-center justify-between border-t border-neutral-100 pt-4 px-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition-colors min-h-[44px]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          <span className="text-xs text-neutral-500 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition-colors min-h-[44px]"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
