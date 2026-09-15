import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getBuyerCart } from "@/features/cart/queries";
import { CartView } from "@/features/cart/components/cart-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shopping Cart | AgroMarket",
};

export default async function CartPage() {
  const user = await requireAuth();
  const [cart, supabase] = await Promise.all([
    getBuyerCart(user.id),
    createClient(),
  ]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, lga, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (!cart) {
    return (
      <div className="min-h-screen bg-neutral-50/70 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm text-neutral-500">Failed to load shopping cart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Navigation Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/marketplace" className="hover:text-emerald-700 transition">
            Marketplace
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Shopping Cart</span>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Produce Shopping Cart
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Review your produce orders from Nigerian farms and agribusinesses.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1 self-start sm:self-auto"
          >
            &larr; Continue Shopping
          </Link>
        </div>

        {/* Cart View Component */}
        <CartView cart={cart} userProfile={profile} />
      </div>
    </div>
  );
}
