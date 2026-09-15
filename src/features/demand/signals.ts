import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformDemandSignal } from "./types";
import { normalizeDemandQuantity, resolveCanonicalDemandUnit } from "./units";

/**
 * Aggregates actual AgroMarket platform activity signals from authoritative database tables.
 * Strictly avoids inventing clickstream or search counts that are not currently stored.
 * Enforces unit consistency by deterministically normalizing compatible units to canonical units
 * and strictly excluding active cart interest items from completed sales volume.
 */
export async function getPlatformDemandSignals(
  productId: string,
  regionState?: string
): Promise<PlatformDemandSignal> {
  const admin = createAdminClient();

  // 1. Fetch Product details
  const { data: product } = await admin
    .from("products")
    .select("id, name, default_unit")
    .eq("id", productId)
    .single();

  const productName = product?.name || "Agricultural Commodity";
  const rawDefaultUnit = product?.default_unit || "KG";
  const canonicalUnit = resolveCanonicalDemandUnit(rawDefaultUnit);

  // 2. Query completed/placed order items from the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let orderItemsQuery = admin
    .from("order_items")
    .select(`
      id, quantity, unit_snapshot, created_at,
      orders!inner (id, status, delivery_state)
    `)
    .eq("product_id", productId)
    .gte("created_at", thirtyDaysAgo)
    .not("orders.status", "eq", "CANCELLED");

  if (regionState) {
    orderItemsQuery = orderItemsQuery.eq("orders.delivery_state", regionState);
  }

  const { data: orderItems } = await orderItemsQuery;

  let totalQuantitySold30Days = 0;
  let orderCount30Days = 0;
  let lastOrderAt: string | null = null;
  let incompatibleUnitCount = 0;

  if (orderItems && orderItems.length > 0) {
    orderCount30Days = orderItems.length;
    for (const item of orderItems) {
      const norm = normalizeDemandQuantity(
        Number(item.quantity),
        item.unit_snapshot || rawDefaultUnit,
        canonicalUnit
      );

      if (norm.isCompatible && norm.normalizedQuantity !== null) {
        totalQuantitySold30Days += norm.normalizedQuantity;
      } else {
        incompatibleUnitCount++;
      }

      if (!lastOrderAt || new Date(item.created_at) > new Date(lastOrderAt)) {
        lastOrderAt = item.created_at;
      }
    }
  }

  // 3. Query active cart items for this product (interest signal only; never counted as completed sales)
  let cartCount = 0;
  const { data: cartData } = await admin
    .from("cart_items")
    .select(`
      id, quantity,
      listings!inner (product_id, state)
    `)
    .eq("listings.product_id", productId);

  if (cartData) {
    type CartRow = {
      id: string;
      quantity: number;
      listings: { product_id: string; state: string } | null;
    };
    const cartRows = cartData as unknown as CartRow[];
    const filteredCarts = regionState
      ? cartRows.filter((c) => c.listings?.state === regionState)
      : cartRows;
    cartCount = filteredCarts.reduce((acc, c) => acc + Number(c.quantity), 0);
  }

  // 4. Query active listings count
  let listingsQuery = admin
    .from("listings")
    .select("id", { count: "exact" })
    .eq("product_id", productId)
    .eq("is_active", true);

  if (regionState) {
    listingsQuery = listingsQuery.eq("state", regionState);
  }

  const { count: listingsCount } = await listingsQuery;

  // 5. Assess confidence of platform signal
  let signalConfidence: PlatformDemandSignal["signalConfidence"] = "LOW_DATA";
  if (orderCount30Days >= 10) {
    signalConfidence = "HIGH";
  } else if (orderCount30Days >= 3 || cartCount > 5) {
    signalConfidence = "MODERATE";
  }

  const telemetryNotes = [
    `Historical sales volume normalized to canonical unit (${canonicalUnit}) from confirmed AgroMarket orders.`,
    "Active cart items represent current buyer demand interest and pipeline intent; they are strictly excluded from completed historical sales volume.",
    "Clickstream search and product-page view signals are currently deferred until client event instrumentation is connected.",
  ];

  if (incompatibleUnitCount > 0) {
    telemetryNotes.push(
      `Excluded ${incompatibleUnitCount} historical order item(s) due to incompatible packaging units that could not be safely converted to ${canonicalUnit}.`
    );
  }

  return {
    productId,
    productName,
    regionState,
    orderCount30Days,
    totalQuantitySold30Days: Number(totalQuantitySold30Days.toFixed(2)),
    activeCartItemsCount: cartCount,
    activeListingsCount: listingsCount || 0,
    unit: canonicalUnit,
    lastOrderAt,
    signalConfidence,
    telemetryNotes,
  };
}
