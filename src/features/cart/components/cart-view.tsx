"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BuyerCart, CartItemDetail } from "../types";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  clearCartAction,
  removeCartItemAction,
  updateCartItemAction,
} from "../actions";
import { createOrderFromCartAction } from "@/features/orders/actions";

interface CartViewProps {
  cart: BuyerCart;
  userProfile?: {
    state?: string | null;
    lga?: string | null;
    phone?: string | null;
  } | null;
}

export function CartView({ cart, userProfile }: CartViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Delivery form state initialized with user profile defaults if present
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryState, setDeliveryState] = useState(userProfile?.state || "Lagos");
  const [deliveryLga, setDeliveryLga] = useState(userProfile?.lga || "");
  const [contactPhone, setContactPhone] = useState(userProfile?.phone || "");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleUpdateQuantity = (item: CartItemDetail, newQty: number) => {
    if (newQty < item.minimumOrderQuantity) return;
    if (newQty > item.quantityAvailable) return;

    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateCartItemAction(item.id, newQty);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to update quantity.");
      }
      router.refresh();
    });
  };

  const handleRemove = (cartItemId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await removeCartItemAction(cartItemId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to remove item.");
      }
      router.refresh();
    });
  };

  const handleClear = () => {
    if (!confirm("Are you sure you want to clear your entire cart?")) return;
    setErrorMessage(null);
    startTransition(async () => {
      const res = await clearCartAction();
      if (!res.success) {
        setErrorMessage(res.error || "Failed to clear cart.");
      }
      router.refresh();
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const res = await createOrderFromCartAction({
        deliveryAddress,
        deliveryState,
        deliveryLga,
        contactPhone,
        deliveryNotes,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to place order.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      const orderId = res.data?.orderId;
      if (orderId) {
        router.push(`/account/orders/${orderId}`);
      } else {
        router.push("/account/orders");
      }
      router.refresh();
    });
  };

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Your shopping cart is empty</h2>
        <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
          Explore wholesale farm produce and add items from verified Nigerian producers.
        </p>
        <div className="mt-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Explore Marketplace Produce &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // Group items by seller for clear multi-seller visibility
  const itemsBySeller = cart.items.reduce<Record<string, { sellerName: string; items: CartItemDetail[] }>>(
    (acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = {
          sellerName: item.sellerName,
          items: [],
        };
      }
      acc[item.sellerId].items.push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Cart Items (2/3) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Multi-Seller Notification Banner */}
        <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
              {cart.sellerCount}
            </span>
            <span>
              <strong>{cart.sellerCount} distinct {cart.sellerCount === 1 ? "producer" : "producers"}</strong> represented in your order.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="text-neutral-500 hover:text-rose-600 font-medium hover:underline text-xs"
          >
            Clear Cart
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-2">
            <svg className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold">Unable to process cart operation</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Sellers and Items */}
        {Object.entries(itemsBySeller).map(([sellerId, group]) => (
          <div
            key={sellerId}
            className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Seller Header */}
            <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-800">Producer: {group.sellerName}</span>
                <span className="rounded-md bg-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  {group.items[0]?.sellerState}
                </span>
              </div>
              <span className="text-neutral-500 font-medium text-[11px]">
                {group.items.length} {group.items.length === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Line Items */}
            <div className="divide-y divide-neutral-100">
              {group.items.map((item) => (
                <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      {item.productName} • {item.categoryName}
                    </span>
                    <Link
                      href={`/marketplace/${item.listingId}`}
                      className="text-sm font-bold text-neutral-900 hover:text-emerald-700 transition line-clamp-1 mt-0.5"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 flex items-baseline gap-2 text-xs text-neutral-600">
                      <span className="font-bold text-neutral-900">{formatNGN(item.pricePerUnit)}</span>
                      <span>per {item.unit}</span>
                      <span className="text-neutral-300">|</span>
                      <span>MOQ: {item.minimumOrderQuantity} {item.unit}</span>
                    </div>

                    {/* Stock Alert */}
                    {item.quantity > item.quantityAvailable && (
                      <div className="mt-2 text-xs font-semibold text-rose-600">
                        Warning: Only {item.quantityAvailable} {item.unit} currently available!
                      </div>
                    )}
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    {/* Stepper */}
                    <div className="flex items-center rounded-lg border border-neutral-300 bg-white">
                      <button
                        type="button"
                        disabled={isPending || item.quantity <= item.minimumOrderQuantity}
                        onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                        className="px-2.5 py-1 text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 rounded-l-lg"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-xs font-semibold text-neutral-900 min-w-[2.5rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isPending || item.quantity >= item.quantityAvailable}
                        onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                        className="px-2.5 py-1 text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 rounded-r-lg"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[5.5rem]">
                      <div className="text-sm font-bold text-neutral-900">
                        {formatNGN(item.subtotal)}
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(item.id)}
                        className="text-[11px] text-neutral-400 hover:text-rose-600 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right Column: Checkout & Order Form (1/3) */}
      <div className="space-y-6">
        <form
          onSubmit={handlePlaceOrder}
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5"
        >
          <h2 className="text-base font-bold text-neutral-900">Delivery Information</h2>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Street Address / Delivery Point <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 15 Commercial Avenue, Yaba"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              />
              {fieldErrors.deliveryAddress && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.deliveryAddress[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  State <span className="text-rose-500">*</span>
                </label>
                <select
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  required
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  LGA <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Mainland"
                  value={deliveryLga}
                  onChange={(e) => setDeliveryLga(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Recipient Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 08012345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              />
              {fieldErrors.contactPhone && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.contactPhone[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Delivery Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Gate code, landmark, or specific drop-off notes..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Order Summary Pricing */}
          <div className="pt-4 border-t border-neutral-100 space-y-2.5 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Produce Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})</span>
              <span className="font-semibold text-neutral-900">{formatNGN(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Delivery Fee</span>
              <span className="font-semibold text-emerald-700">Calculated upon dispatch</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-neutral-100 text-sm font-black text-neutral-900">
              <span>Order Total</span>
              <span className="text-lg text-emerald-700">{formatNGN(cart.total)}</span>
            </div>
          </div>

          {/* Submission */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 transition"
          >
            {isPending ? "Creating Order..." : "Place Produce Order"}
          </button>

          <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
            Placing this order atomically reserves produce from the farm seller. Payment and fulfillment processing will proceed in Phase 0.6.
          </p>
        </form>
      </div>
    </div>
  );
}
