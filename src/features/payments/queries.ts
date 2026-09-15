import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server";
import { PaymentDetail, PaymentProviderName, PaymentStatus, PaymentMethod } from "./types";

/**
 * Retrieves payment records associated with an order.
 * Scoped to the authenticated buyer or admin.
 */
export async function getOrderPayments(orderId: string): Promise<PaymentDetail[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error || !payments) {
    return [];
  }

  // Double check authorization: buyer or admin
  const isBuyerOrAdmin = payments.every(
    (p) => p.buyer_id === user.id || user.roles.includes("ADMIN")
  );

  if (!isBuyerOrAdmin) {
    return [];
  }

  return payments.map((p) => ({
    id: p.id,
    orderId: p.order_id,
    buyerId: p.buyer_id,
    amount: Number(p.amount),
    currency: p.currency as "NGN",
    provider: p.provider as PaymentProviderName,
    providerReference: p.provider_reference,
    status: p.status as PaymentStatus,
    paymentMethod: p.payment_method as PaymentMethod,
    channelMetadata: (p.channel_metadata as Record<string, unknown>) || {},
    paidAt: p.paid_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export interface PaymentReconciliationSummary {
  totalPayments: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  totalVolumeNgn: number;
  recentWebhookEvents: Array<{
    id: string;
    provider: string;
    eventType: string;
    status: string;
    createdAt: string;
  }>;
}

/**
 * Admin query for payment reconciliation and system auditing.
 */
export async function getPaymentReconciliationSummary(): Promise<PaymentReconciliationSummary> {
  const admin = createAdminClient();

  const { data: payments } = await admin
    .from("payments")
    .select("status, amount");

  let successfulCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let totalVolumeNgn = 0;

  if (payments) {
    for (const p of payments) {
      if (p.status === "SUCCESSFUL" || p.status === "PAID") {
        successfulCount++;
        totalVolumeNgn += Number(p.amount) || 0;
      } else if (p.status === "FAILED") {
        failedCount++;
      } else {
        pendingCount++;
      }
    }
  }

  const { data: webhookEvents } = await admin
    .from("payment_webhook_events")
    .select("id, provider, event_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    totalPayments: payments?.length || 0,
    successfulCount,
    pendingCount,
    failedCount,
    totalVolumeNgn,
    recentWebhookEvents: (webhookEvents || []).map((e) => ({
      id: e.id,
      provider: e.provider,
      eventType: e.event_type,
      status: e.status,
      createdAt: e.created_at,
    })),
  };
}
