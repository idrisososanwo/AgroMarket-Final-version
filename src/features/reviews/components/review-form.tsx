"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReviewTargetType } from "../types";
import { createReviewAction } from "../actions";
import { Star, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ReviewFormProps {
  targetType: ReviewTargetType;
  serviceId?: string;
  orderId?: string;
  listingId?: string;
  sellerId?: string;
  equipmentId?: string;
  targetTitle?: string;
  onSuccess?: (reviewId: string) => void;
  className?: string;
}

export function ReviewForm({
  targetType,
  serviceId,
  orderId,
  listingId,
  sellerId,
  equipmentId,
  targetTitle,
  onSuccess,
  className = "",
}: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!rating || rating < 1 || rating > 5) {
      setFieldErrors({ rating: ["Please select a rating between 1 and 5 stars."] });
      return;
    }

    startTransition(async () => {
      try {
        const response = await createReviewAction({
          targetType,
          rating,
          comment: comment.trim() || null,
          serviceId: serviceId || null,
          orderId: orderId || null,
          listingId: listingId || null,
          sellerId: sellerId || null,
          equipmentId: equipmentId || null,
        });

        if (!response.success) {
          setGeneralError(response.error || "Failed to submit review.");
          if (response.fieldErrors) {
            setFieldErrors(response.fieldErrors);
          }
          return;
        }

        setIsSuccess(true);
        if (onSuccess && response.data?.reviewId) {
          onSuccess(response.data.reviewId);
        } else {
          router.refresh();
        }
      } catch (err: unknown) {
        setGeneralError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    });
  };

  if (isSuccess) {
    return (
      <div
        className={`rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center ${className}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-neutral-900">
          Review Submitted!
        </h3>
        <p className="mt-1 text-xs text-neutral-600 max-w-sm mx-auto">
          Thank you for providing honest feedback. Your review will help other farmers
          and clients make informed decisions.
        </p>
      </div>
    );
  }

  const effectiveRating = hoverRating ?? rating;

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5 ${className}`}
    >
      <div>
        <h3 className="text-base font-bold text-neutral-900">
          Write a Review
          {targetTitle && (
            <span className="block text-xs font-normal text-neutral-500 mt-0.5">
              for {targetTitle}
            </span>
          )}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Share your experience regarding timeliness, quality of work, and professionalism.
        </p>
      </div>

      {generalError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{generalError}</span>
        </div>
      )}

      {/* 1–5 Star Interactive Selector */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
          Your Rating <span className="text-rose-500">*</span>
        </label>
        <div
          className="flex items-center gap-1.5"
          role="radiogroup"
          aria-label="Star Rating from 1 to 5"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="p-1 rounded-lg text-neutral-300 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= effectiveRating
                    ? "fill-amber-400 text-amber-400"
                    : "fill-neutral-100 text-neutral-300"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-xs font-bold text-neutral-700">
            {effectiveRating} / 5
          </span>
        </div>
        {fieldErrors.rating && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.rating[0]}</p>
        )}
      </div>

      {/* Comment Field with Character Counter */}
      <div>
        <label
          htmlFor="review-comment"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Feedback & Comments <span className="text-neutral-400 font-normal">(Optional)</span>
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          maxLength={2000}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was the equipment condition, operator punctuality, and output quality?"
          className="w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          aria-describedby={fieldErrors.comment ? "comment-err" : undefined}
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Reviews are verified after service completion</span>
          <span>{comment.length} / 2000</span>
        </div>
        {fieldErrors.comment && (
          <p id="comment-err" className="mt-1 text-xs text-rose-600">
            {fieldErrors.comment[0]}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Review...
            </>
          ) : (
            "Submit Review"
          )}
        </button>
      </div>
    </form>
  );
}
