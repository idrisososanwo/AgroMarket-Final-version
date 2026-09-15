"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyPaymentAction } from "@/features/payments/actions";

export default function PaymentCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params?.orderId as string;
  // Paystack sends 'reference' or 'trxref', Flutterwave sends 'tx_ref'
  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    searchParams.get("tx_ref");

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setVerifying(false);
      setErrorMessage("No transaction reference was returned by the payment gateway.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const response = await verifyPaymentAction({ reference: reference! });
        if (!isMounted) return;

        if (response.success && response.data?.status === "SUCCESSFUL") {
          setSuccess(true);
          setVerifying(false);
          // Redirect to order receipt after short delay
          setTimeout(() => {
            router.push(`/account/orders/${orderId}?payment=confirmed`);
          }, 2000);
        } else {
          setSuccess(false);
          setVerifying(false);
          setErrorMessage(
            response.error || "Payment could not be verified or was reported as unsuccessful."
          );
        }
      } catch {
        if (!isMounted) return;
        setSuccess(false);
        setVerifying(false);
        setErrorMessage("A network error occurred while verifying your payment.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [reference, orderId, router]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 text-center">
        {verifying && (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-emerald-950">Verifying Payment...</h2>
            <p className="text-sm text-emerald-700">
              Please wait while our servers cryptographically confirm your transaction with the payment gateway.
            </p>
            <p className="text-xs font-mono text-stone-500">Ref: {reference || "Pending..."}</p>
          </div>
        )}

        {!verifying && success && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-950">Payment Confirmed!</h2>
            <p className="text-sm text-emerald-700">
              Your transaction has been verified. Redirecting you to your order confirmation...
            </p>
            <Link
              href={`/account/orders/${orderId}`}
              className="inline-block mt-4 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700"
            >
              View Order Receipt
            </Link>
          </div>
        )}

        {!verifying && !success && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-950">Payment Verification Failed</h2>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 text-left">
              {errorMessage}
            </p>
            <p className="text-xs text-stone-500">
              If money was deducted from your account, your order will automatically be confirmed once the provider webhook arrives.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/account/orders/${orderId}/pay`}
                className="w-full bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700"
              >
                Retry Payment
              </Link>
              <Link
                href={`/account/orders/${orderId}`}
                className="w-full bg-stone-100 text-stone-700 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-stone-200"
              >
                Back to Order
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
