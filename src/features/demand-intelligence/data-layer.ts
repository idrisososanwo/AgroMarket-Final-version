/**
 * AgroMarket Phase 2.5: Demand Intelligence Data Access Layer
 *
 * Provides typed, server-side data extraction over existing AgroMarket tables:
 * - products
 * - order_items & orders
 * - b2b_demands
 * - cart_items & listings
 * - shared_purchases & participants
 * - agricultural_intelligence_signals
 *
 * STRICT INTEGRITY:
 * - Uses real platform activity only. Never synthesizes fake orders or fictitious demand.
 * - Enforces zero-tolerance anti-pork prohibition.
 * - Anonymizes buyer identities: never exposes private user IDs, business names, or contact addresses.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { IntelligenceSignal } from "@/features/intelligence/types";
import { resolveCanonicalDemandUnit } from "@/features/demand/units";

export interface LoadedDemandEvidence {
  commodity: string;
  state: string;
  productId?: string;
  defaultUnit: string;
  historicalOrders: Array<{
    id: string;
    quantity: number;
    unit?: string;
    createdAt: string;
    deliveryState?: string;
    sharedPurchaseId?: string | null;
  }>;
  b2bDemands: Array<{
    id: string;
    title: string;
    quantity: number;
    unit: string;
    state: string;
    status: string;
    createdAt: string;
    deliveryDate: string;
  }>;
  activeCarts: Array<{
    id: string;
    quantity: number;
    state?: string;
  }>;
  sharedPurchases: Array<{
    id: string;
    title: string;
    totalQuantity: number;
    allocatedQuantity: number;
    status: string;
    state?: string;
  }>;
  supplyListings: Array<{
    id: string;
    title: string;
    quantity: number;
    unit: string;
    state: string;
  }>;
  contextualSignals: IntelligenceSignal[];
  regionalBreakdown: Record<string, number>;
}

export async function loadDemandEvidence(
  commodity: string,
  state: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<LoadedDemandEvidence> {
  assertNoProhibitedProduce(commodity, "Evidence commodity");

  let supabase = supabaseClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      supabase = null;
    }
  }

  if (!supabase) {
    return {
      commodity,
      state,
      defaultUnit: "KG",
      historicalOrders: [],
      b2bDemands: [],
      activeCarts: [],
      sharedPurchases: [],
      supplyListings: [],
      contextualSignals: [],
      regionalBreakdown: {},
    };
  }

  // 1. Resolve product metadata
  const { data: productData } = await supabase
    .from("products")
    .select("id, name, default_unit")
    .ilike("name", `%${commodity}%`)
    .limit(1)
    .maybeSingle();

  const productId = productData?.id;
  const defaultUnit = resolveCanonicalDemandUnit(productData?.default_unit || "KG");

  // 2. Query historical orders up to 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  let ordersQuery = supabase
    .from("order_items")
    .select(`
      id, quantity, unit_snapshot, created_at,
      orders!inner (id, status, delivery_state, shared_purchase_id)
    `)
    .gte("created_at", ninetyDaysAgo)
    .not("orders.status", "eq", "CANCELLED");

  if (productId) {
    ordersQuery = ordersQuery.eq("product_id", productId);
  }

  const { data: rawOrderItems } = await ordersQuery;

  interface RawOrderItemRow {
    id: string;
    quantity: number | string;
    unit_snapshot: string | null;
    created_at: string;
    orders: {
      id: string;
      status: string;
      delivery_state: string;
      shared_purchase_id: string | null;
    } | null;
  }

  const historicalOrders: LoadedDemandEvidence["historicalOrders"] = [];
  const regionalBreakdown: Record<string, number> = {};

  for (const item of ((rawOrderItems || []) as unknown as RawOrderItemRow[])) {
    const qty = Number(item.quantity) || 0;
    const deliveryState = item.orders?.delivery_state || state;
    historicalOrders.push({
      id: item.id,
      quantity: qty,
      unit: item.unit_snapshot || defaultUnit,
      createdAt: item.created_at,
      deliveryState,
      sharedPurchaseId: item.orders?.shared_purchase_id,
    });

    regionalBreakdown[deliveryState] = (regionalBreakdown[deliveryState] || 0) + qty;
  }

  // 3. Query B2B Demands
  const { data: rawB2BDemands } = await supabase
    .from("b2b_demands")
    .select("id, title, commodity_or_product, quantity, unit, state, status, created_at, desired_delivery_date")
    .ilike("commodity_or_product", `%${commodity}%`)
    .in("status", ["ACTIVE", "MATCHED", "PARTIALLY_MATCHED", "FULFILLED"])
    .order("created_at", { ascending: false })
    .limit(50);

  interface RawB2BRow {
    id: string;
    title: string;
    quantity: number | string;
    unit: string;
    state: string;
    status: string;
    created_at: string;
    desired_delivery_date: string;
  }

  const b2bDemands: LoadedDemandEvidence["b2bDemands"] = ((rawB2BDemands || []) as unknown as RawB2BRow[]).map(
    (b) => ({
      id: b.id,
      title: b.title,
      quantity: Number(b.quantity) || 0,
      unit: b.unit,
      state: b.state,
      status: b.status,
      createdAt: b.created_at,
      deliveryDate: b.desired_delivery_date,
    })
  );

  // 4. Query active cart items (Intent only, never counted as completed sales)
  let cartQuery = supabase
    .from("cart_items")
    .select(`
      id, quantity,
      listings!inner (product_id, state)
    `);

  if (productId) {
    cartQuery = cartQuery.eq("listings.product_id", productId);
  }

  const { data: rawCarts } = await cartQuery;

  interface RawCartRow {
    id: string;
    quantity: number | string;
    listings: { product_id: string; state: string } | null;
  }

  const activeCarts: LoadedDemandEvidence["activeCarts"] = ((rawCarts || []) as unknown as RawCartRow[]).map(
    (c) => ({
      id: c.id,
      quantity: Number(c.quantity) || 0,
      state: c.listings?.state,
    })
  );

  // 5. Query Shared Purchases
  const { data: rawSharedPurchases } = await supabase
    .from("shared_purchases")
    .select("id, title, total_quantity, allocated_quantity, status")
    .ilike("title", `%${commodity}%`)
    .in("status", ["OPEN", "TARGET_REACHED", "CONFIRMED", "COMPLETED"])
    .limit(25);

  interface RawSPRow {
    id: string;
    title: string;
    total_quantity: number | string;
    allocated_quantity: number | string;
    status: string;
  }

  const sharedPurchases: LoadedDemandEvidence["sharedPurchases"] = (
    (rawSharedPurchases || []) as unknown as RawSPRow[]
  ).map((sp) => ({
    id: sp.id,
    title: sp.title,
    totalQuantity: Number(sp.total_quantity) || 0,
    allocatedQuantity: Number(sp.allocated_quantity) || 0,
    status: sp.status,
  }));

  // 6. Query Active Listings (to detect unmet demand vs available listed supply)
  let listingsQuery = supabase
    .from("listings")
    .select("id, title, quantity, unit, state")
    .eq("is_active", true)
    .eq("state", state);

  if (productId) {
    listingsQuery = listingsQuery.eq("product_id", productId);
  } else {
    listingsQuery = listingsQuery.ilike("title", `%${commodity}%`);
  }

  const { data: rawListings } = await listingsQuery.limit(50);

  interface RawListingRow {
    id: string;
    title: string;
    quantity: number | string;
    unit: string;
    state: string;
  }

  const supplyListings: LoadedDemandEvidence["supplyListings"] = (
    (rawListings || []) as unknown as RawListingRow[]
  ).map((l) => ({
    id: l.id,
    title: l.title,
    quantity: Number(l.quantity) || 0,
    unit: l.unit,
    state: l.state,
  }));

  // 7. Contextual Signals (Market, Disruption, Security from Phase 2.1 / 2.3 / 2.4)
  const { data: rawSignals } = await supabase
    .from("agricultural_intelligence_signals")
    .select("*")
    .or(`commodity.ilike.%${commodity}%,state.eq.${state}`)
    .order("observed_at", { ascending: false })
    .limit(10);

  const contextualSignals: IntelligenceSignal[] = (rawSignals || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => ({
      id: s.id,
      agentId: s.agent_id,
      signalType: s.signal_type,
      commodity: s.commodity,
      category: s.category || undefined,
      state: s.state,
      lga: s.lga || undefined,
      corridor: s.corridor || undefined,
      magnitude: Number(s.magnitude) || 0,
      confidence: Number(s.confidence) || 0.5,
      source: s.source,
      evidence: Array.isArray(s.evidence) ? s.evidence : [],
      supportingObservationIds: Array.isArray(s.supporting_observation_ids)
        ? s.supporting_observation_ids
        : [],
      observedAt: s.observed_at,
      expiresAt: s.expires_at,
    })
  );

  return {
    commodity,
    state,
    productId,
    defaultUnit,
    historicalOrders,
    b2bDemands,
    activeCarts,
    sharedPurchases,
    supplyListings,
    contextualSignals,
    regionalBreakdown,
  };
}
