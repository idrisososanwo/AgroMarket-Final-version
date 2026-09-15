import { requireAnyRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { FarmerSharedPurchaseForm } from "@/features/shared-purchase/components/farmer-shared-purchase-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Launch Shared Purchase Pool | AgroMarket Farmer",
};

export default async function NewSharedPurchasePage() {
  const user = await requireAnyRole(["FARMER", "ADMIN"]);
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      unit,
      price_per_unit,
      state,
      lga,
      pickup_address,
      inventory (
        quantity_on_hand,
        quantity_reserved,
        quantity_available
      )
    `)
    .eq("seller_id", user.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  interface ListingRow {
    id: string;
    title: string;
    unit: string;
    price_per_unit: number | string;
    state: string;
    lga: string;
    pickup_address: string;
    inventory?:
      | {
          quantity_on_hand?: number | string | null;
          quantity_reserved?: number | string | null;
          quantity_available?: number | string | null;
        }
      | Array<{
          quantity_on_hand?: number | string | null;
          quantity_reserved?: number | string | null;
          quantity_available?: number | string | null;
        }>
      | null;
  }

  const formattedListings = (listings || [])
    .map((rawItem) => {
      const l = rawItem as unknown as ListingRow;
      const inv = Array.isArray(l.inventory) ? l.inventory[0] : l.inventory;
      const available = Number(
        inv?.quantity_available ??
          Number(inv?.quantity_on_hand || 0) - Number(inv?.quantity_reserved || 0)
      );

      return {
        id: l.id,
        title: l.title,
        unit: l.unit,
        pricePerUnit: Number(l.price_per_unit),
        quantityAvailable: Math.max(0, available),
        state: l.state,
        lga: l.lga,
        pickupAddress: l.pickup_address,
      };
    })
    .filter((l) => l.quantityAvailable > 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <FarmerSharedPurchaseForm listings={formattedListings} />
    </div>
  );
}
