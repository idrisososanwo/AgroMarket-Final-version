import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getMyReviews } from "@/features/reviews/queries";
import { Star, ShieldCheck, ArrowLeft, ArrowRight, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Reviews & Feedback | AgroMarket",
  description: "View the reviews, ratings, and verified transaction feedback you have submitted on AgroMarket.",
};

export default async function AccountReviewsPage() {
  await requireAuth();
  const { reviews, totalCount } = await getMyReviews(1, 50);

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
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <MessageSquare className="h-4 w-4" />
            <span>Community Feedback</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            My Submitted Reviews
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Reviews and ratings you have shared for services, marketplace purchases, and equipment.
          </p>
        </div>

        {/* Review List or Empty State */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs text-neutral-500 font-medium px-1">
              You have published <strong>{totalCount}</strong> verified reviews
            </div>

            {reviews.map((review) => {
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
                  className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                        {review.targetType}
                      </span>
                      {review.isVerifiedTransaction && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          Verified Transaction
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-neutral-100 text-neutral-200"
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-neutral-700">
                        {review.rating}/5
                      </span>
                    </div>
                  </div>

                  {review.comment ? (
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic">
                      No written comment provided.
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs text-neutral-500">
                    <time dateTime={review.createdAt}>Submitted {formattedDate}</time>

                    {review.serviceId && (
                      <Link
                        href={`/services/${review.serviceId}`}
                        className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                      >
                        View Service <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    )}
                    {review.listingId && (
                      <Link
                        href={`/marketplace/${review.listingId}`}
                        className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                      >
                        View Listing <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">
              No reviews written yet
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
              Once you complete an order or finished an agricultural service booking, you can submit verified ratings to support the community.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/account/orders"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px]"
              >
                View My Orders
              </Link>
              <Link
                href="/account/service-requests"
                className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
              >
                View Service Bookings
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
