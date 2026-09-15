"use client";

import { useState } from "react";
import { PaymentProviderName } from "../types";
import { initializePaymentAction } from "../actions";

interface CheckoutFormProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

export function CheckoutForm({ orderId, orderNumber, totalAmount }: CheckoutFormProps) {
  const [provider, setProvider] = useState<PaymentProviderName>("PAYSTACK");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await initializePaymentAction({
        orderId,
        provider,
      });

      if (!response.success || !response.data) {
        setError(response.error || "Failed to initialize payment. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect user to the official hosted checkout URL provided by Paystack / Flutterwave
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        setError("Missing provider authorization URL.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Payment initialization error:", err);
      setError("A connection error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">Payment Initialization Failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-emerald-950">
            Select Payment Gateway
          </label>
          <span className="text-xs text-stone-500 font-mono">
            Ref: {orderNumber}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Paystack Option */}
          <button
            type="button"
            onClick={() => setProvider("PAYSTACK")}
            className={`p-4 border-2 rounded-xl text-left transition-all flex flex-col justify-between ${
              provider === "PAYSTACK"
                ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600"
                : "border-emerald-100 hover:border-emerald-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-emerald-950 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                Paystack
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-xs text-emerald-700">
              Cards (Mastercard, Visa, Verve), Bank Transfer, USSD & Apple Pay. Instant verification.
            </p>
          </button>

          {/* Flutterwave Option */}
          <button
            type="button"
            onClick={() => setProvider("FLUTTERWAVE")}
            className={`p-4 border-2 rounded-xl text-left transition-all flex flex-col justify-between ${
              provider === "FLUTTERWAVE"
                ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600"
                : "border-emerald-100 hover:border-emerald-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-emerald-950 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                Flutterwave
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full">
                Alternative
              </span>
            </div>
            <p className="text-xs text-emerald-700">
              Cards, Mobile Money, Bank Account Debit, Barter & Paga.
            </p>
          </button>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Redirecting to Secure Gateway...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pay ₦{totalAmount.toLocaleString()} via {provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}
            </>
          )}
        </button>
      </div>

      <div className="border-t border-emerald-100 pt-4 text-center">
        <div className="flex items-center justify-center gap-6 text-xs text-emerald-600">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            256-Bit SSL Encryption
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            No Raw Card Data Stored
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            CBN Regulated Gateways
          </div>
        </div>
      </div>
    </div>
  );
}
