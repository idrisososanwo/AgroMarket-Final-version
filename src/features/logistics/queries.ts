import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server";
import { DeliveryDetail, LogisticsProviderDetail } from "./types";
import { LogisticsService } from "./service";

/**
 * Retrieves all delivery consignments associated with an order.
 * Scoped to buyer, participating sellers, assigned providers, or platform admins.
 */
export async function getOrderDeliveries(orderId: string): Promise<DeliveryDetail[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  // Query deliveries table; RLS automatically filters
  const { data: deliveries, error } = await supabase
    .from("deliveries")
    .select("id")
    .eq("order_id", orderId);

  if (error || !deliveries || deliveries.length === 0) {
    // If no deliveries yet, check if order is PAID and auto-initialize deliveries!
    const { data: order } = await supabase
      .from("orders")
      .select("status, buyer_id")
      .eq("id", orderId)
      .single();

    if (order && (order.status === "PAID" || order.status === "PROCESSING")) {
      const isBuyer = order.buyer_id === user.id;
      const isAdmin = user.roles.includes("ADMIN");
      if (isBuyer || isAdmin) {
        try {
          const createdIds = await LogisticsService.createOrderDeliveries(orderId, user.id);
          const results: DeliveryDetail[] = [];
          for (const id of createdIds) {
            const detail = await LogisticsService.getDeliveryDetails(id);
            if (detail) results.push(detail);
          }
          return results;
        } catch (initErr) {
          console.error("Auto-provision deliveries error:", initErr);
        }
      }
    }
    return [];
  }

  const results: DeliveryDetail[] = [];
  for (const row of deliveries) {
    const detail = await LogisticsService.getDeliveryDetails(row.id);
    if (detail) {
      results.push(detail);
    }
  }

  return results;
}

/**
 * Retrieves a single delivery consignment with full tracking details.
 */
export async function getDeliveryById(deliveryId: string): Promise<DeliveryDetail | null> {
  await requireAuth();
  return LogisticsService.getDeliveryDetails(deliveryId);
}

/**
 * Retrieves deliveries assigned to the authenticated logistics provider.
 */
export async function getAssignedDeliveriesForProvider(): Promise<DeliveryDetail[]> {
  const user = await requireAuth();
  const admin = createAdminClient();

  // Find provider record where profile_id matches current user, or if admin return all active
  const isAdmin = user.roles.includes("ADMIN");

  let deliveryQuery = admin.from("deliveries").select("id, status, created_at").order("created_at", { ascending: false });

  if (!isAdmin) {
    const { data: provider } = await admin
      .from("logistics_providers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!provider) {
      return [];
    }

    deliveryQuery = deliveryQuery.eq("provider_id", provider.id);
  }

  const { data: deliveries } = await deliveryQuery;
  if (!deliveries) return [];

  const results: DeliveryDetail[] = [];
  for (const d of deliveries) {
    const detail = await LogisticsService.getDeliveryDetails(d.id);
    if (detail) results.push(detail);
  }

  return results;
}

/**
 * Retrieves active logistics providers for administrative assignment.
 */
export async function getActiveLogisticsProviders(): Promise<LogisticsProviderDetail[]> {
  const admin = createAdminClient();

  const { data: providers, error } = await admin
    .from("logistics_providers")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !providers) {
    return [];
  }

  return providers.map((p) => ({
    id: p.id,
    profileId: p.profile_id,
    name: p.name,
    companyRc: p.company_rc,
    contactPerson: p.contact_person,
    phone: p.phone,
    email: p.email,
    coverageStates: p.coverage_states || [],
    fleetTypes: p.fleet_types || [],
    isVerified: p.is_verified,
    isActive: p.is_active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}
