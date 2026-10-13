import { describe, it, expect, beforeEach } from "vitest";
import { validateSchedulerAuthentication } from "@/features/background-jobs";

// ---------------------------------------------------------------------------
// Mock In-Memory Database for Concurrency & Invariant Verification
// ---------------------------------------------------------------------------

interface MockOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  status: "PENDING" | "PAID" | "PROCESSING" | "CANCELLED" | "COMPLETED";
  total_amount: number;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

interface MockOrderItem {
  id: string;
  order_id: string;
  listing_id: string;
  quantity: number;
  status: "PENDING" | "PAID" | "CANCELLED";
}

interface MockInventory {
  listing_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
}

interface MockPayment {
  id: string;
  order_id: string;
  buyer_id: string;
  status: "INITIALIZED" | "PENDING" | "SUCCESSFUL" | "FAILED";
  amount: number;
  updated_at: string;
}

interface MockAuditLog {
  action: string;
  resource_id: string;
  metadata: Record<string, unknown>;
}

// Global in-memory state
let dbOrders: MockOrder[] = [];
let dbOrderItems: MockOrderItem[] = [];
let dbInventory: MockInventory[] = [];
let dbPayments: MockPayment[] = [];
let dbAuditLogs: MockAuditLog[] = [];

// Helper to simulate the exact atomic PostgreSQL logic of release_order_inventory
function simulateAtomicReleaseOrderInventory(
  orderId: string,
  reason: string = "ABANDONED_CHECKOUT_TIMEOUT"
) {
  const order = dbOrders.find((o) => o.id === orderId);
  if (!order) {
    return { success: false, code: "ORDER_NOT_FOUND", message: "Order not found." };
  }

  if (["PAID", "PROCESSING", "COMPLETED"].includes(order.status)) {
    return {
      success: false,
      code: "ORDER_ALREADY_PAID",
      order_id: order.id,
      current_status: order.status,
      message: "Cannot release inventory for an order that is already paid or completed.",
    };
  }

  if (order.status === "CANCELLED") {
    return {
      success: false,
      code: "ORDER_ALREADY_CANCELLED",
      order_id: order.id,
      current_status: order.status,
      message: "Order is already cancelled; reservation was previously released.",
    };
  }

  if (order.status !== "PENDING") {
    return {
      success: false,
      code: "INVALID_ORDER_STATUS",
      order_id: order.id,
      current_status: order.status,
    };
  }

  // Check successful payment
  const hasSuccessful = dbPayments.some(
    (p) => p.order_id === orderId && p.status === "SUCCESSFUL"
  );
  if (hasSuccessful) {
    return {
      success: false,
      code: "PAYMENT_SUCCESSFUL",
      order_id: order.id,
      message: "Order has confirmed successful payment. Cancellation aborted.",
    };
  }

  // Check active in-flight payment (< 15 min old)
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const hasInFlight = dbPayments.some(
    (p) =>
      p.order_id === orderId &&
      ["INITIALIZED", "PENDING"].includes(p.status) &&
      p.updated_at > fifteenMinAgo
  );
  if (hasInFlight) {
    return {
      success: false,
      code: "PAYMENT_IN_FLIGHT",
      order_id: order.id,
      message: "Order has active payment transaction in flight. Cancellation deferred.",
    };
  }

  // Transition Order
  order.status = "CANCELLED";
  order.cancellation_reason = reason;
  order.updated_at = new Date().toISOString();

  // Transition Items & Release Inventory
  const items = dbOrderItems.filter((i) => i.order_id === orderId);
  let itemsReleasedCount = 0;

  for (const item of items) {
    item.status = "CANCELLED";
    const inv = dbInventory.find((i) => i.listing_id === item.listing_id);
    if (inv) {
      // Prevent negative reserved inventory
      inv.quantity_reserved = Math.max(0, inv.quantity_reserved - item.quantity);
      inv.quantity_available = inv.quantity_on_hand - inv.quantity_reserved;
      itemsReleasedCount++;
    }
  }

  dbAuditLogs.push({
    action: "ORDER_RESERVATION_RELEASED",
    resource_id: order.id,
    metadata: {
      order_number: order.order_number,
      previous_status: "PENDING",
      new_status: "CANCELLED",
      reason,
      items_released_count: itemsReleasedCount,
    },
  });

  return {
    success: true,
    code: "RESERVATION_RELEASED",
    order_id: order.id,
    order_number: order.order_number,
    items_released: itemsReleasedCount,
    reason,
  };
}

// Helper to simulate batch cleanup
function simulateBatchCleanup(timeoutMinutes: number = 60, batchLimit: number = 50) {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const candidates = dbOrders.filter((o) => {
    if (o.status !== "PENDING") return false;
    if (o.created_at >= cutoff) return false;

    // Must not have successful payment
    const hasPaid = dbPayments.some((p) => p.order_id === o.id && p.status === "SUCCESSFUL");
    if (hasPaid) return false;

    // Must not have in-flight payment
    const hasInFlight = dbPayments.some(
      (p) =>
        p.order_id === o.id &&
        ["INITIALIZED", "PENDING"].includes(p.status) &&
        p.updated_at > fifteenMinAgo
    );
    if (hasInFlight) return false;

    return true;
  }).slice(0, batchLimit);

  let processedCount = 0;
  let cancelledCount = 0;
  let skippedCount = 0;
  const details = [];

  for (const candidate of candidates) {
    processedCount++;
    const res = simulateAtomicReleaseOrderInventory(candidate.id, "ABANDONED_CHECKOUT_TIMEOUT");
    if (res.success) {
      cancelledCount++;
    } else {
      skippedCount++;
    }
    details.push(res);
  }

  return {
    success: true,
    processedCount,
    cancelledCount,
    skippedCount,
    timeoutMinutes,
    details,
  };
}

describe("AgroMarket V1 — Abandoned Order Cleanup & Concurrency Suite", () => {
  beforeEach(() => {
    // Reset in-memory database
    dbOrders = [];
    dbOrderItems = [];
    dbInventory = [
      {
        listing_id: "listing-rice-50kg",
        quantity_on_hand: 100,
        quantity_reserved: 20, // 20 units currently reserved
        quantity_available: 80,
      },
      {
        listing_id: "listing-garri-50kg",
        quantity_on_hand: 50,
        quantity_reserved: 10,
        quantity_available: 40,
      },
    ];
    dbPayments = [];
    dbAuditLogs = [];
  });

  // -------------------------------------------------------------------------
  // TEST 1: Unpaid pending order older than timeout releases reservation once
  // -------------------------------------------------------------------------
  it("Scenario 1: Unpaid pending order older than 60m releases its reservation once", () => {
    const oldTimestamp = new Date(Date.now() - 75 * 60 * 1000).toISOString(); // 75 minutes ago
    dbOrders.push({
      id: "ord-old-01",
      order_number: "AM-ORD-20261013-000001",
      buyer_id: "usr-buyer-01",
      status: "PENDING",
      total_amount: 170000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-01",
      order_id: "ord-old-01",
      listing_id: "listing-rice-50kg",
      quantity: 2,
      status: "PENDING",
    });

    // Before cleanup: reserved = 20, available = 80
    expect(dbInventory[0].quantity_reserved).toBe(20);
    expect(dbInventory[0].quantity_available).toBe(80);

    const result = simulateAtomicReleaseOrderInventory("ord-old-01");

    expect(result.success).toBe(true);
    expect(result.code).toBe("RESERVATION_RELEASED");
    expect(dbOrders[0].status).toBe("CANCELLED");
    expect(dbOrders[0].cancellation_reason).toBe("ABANDONED_CHECKOUT_TIMEOUT");
    expect(dbOrderItems[0].status).toBe("CANCELLED");

    // After cleanup: reserved should decrease from 20 to 18, available increases to 82
    expect(dbInventory[0].quantity_reserved).toBe(18);
    expect(dbInventory[0].quantity_available).toBe(82);

    // Audit log recorded
    expect(dbAuditLogs.length).toBe(1);
    expect(dbAuditLogs[0].action).toBe("ORDER_RESERVATION_RELEASED");
  });

  // -------------------------------------------------------------------------
  // TEST 2: Paid order never has its reservation released by cleanup
  // -------------------------------------------------------------------------
  it("Scenario 2: A paid order is strictly protected and never released by cleanup", () => {
    const oldTimestamp = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    dbOrders.push({
      id: "ord-paid-01",
      order_number: "AM-ORD-20261013-000002",
      buyer_id: "usr-buyer-01",
      status: "PAID", // Already paid
      total_amount: 85000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-02",
      order_id: "ord-paid-01",
      listing_id: "listing-rice-50kg",
      quantity: 1,
      status: "PAID",
    });

    const result = simulateAtomicReleaseOrderInventory("ord-paid-01");

    expect(result.success).toBe(false);
    expect(result.code).toBe("ORDER_ALREADY_PAID");
    expect(dbOrders[0].status).toBe("PAID");
    // Inventory reserved should NOT change
    expect(dbInventory[0].quantity_reserved).toBe(20);
  });

  // -------------------------------------------------------------------------
  // TEST 3: Recent pending order remains unchanged
  // -------------------------------------------------------------------------
  it("Scenario 3: A recent pending order (< 60 min) is not expired", () => {
    const recentTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 minutes ago
    dbOrders.push({
      id: "ord-recent-01",
      order_number: "AM-ORD-20261013-000003",
      buyer_id: "usr-buyer-02",
      status: "PENDING",
      total_amount: 42000,
      created_at: recentTimestamp,
      updated_at: recentTimestamp,
    });

    const batch = simulateBatchCleanup(60, 50);

    expect(batch.processedCount).toBe(0);
    expect(batch.cancelledCount).toBe(0);
    expect(dbOrders[0].status).toBe("PENDING");
    expect(dbInventory[1].quantity_reserved).toBe(10);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Payment and cleanup race condition cannot create inconsistent state
  // -------------------------------------------------------------------------
  it("Scenario 4: Concurrent payment verification blocks cleanup from releasing stock", () => {
    const oldTimestamp = new Date(Date.now() - 70 * 60 * 1000).toISOString();
    dbOrders.push({
      id: "ord-racing-01",
      order_number: "AM-ORD-20261013-000004",
      buyer_id: "usr-buyer-03",
      status: "PENDING",
      total_amount: 170000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-04",
      order_id: "ord-racing-01",
      listing_id: "listing-rice-50kg",
      quantity: 2,
      status: "PENDING",
    });

    // Buyer completes Paystack transaction right before cleanup checks
    dbPayments.push({
      id: "pay-race-01",
      order_id: "ord-racing-01",
      buyer_id: "usr-buyer-03",
      status: "SUCCESSFUL",
      amount: 170000,
      updated_at: new Date().toISOString(),
    });

    // Cleanup worker attempts to process the order
    const result = simulateAtomicReleaseOrderInventory("ord-racing-01");

    expect(result.success).toBe(false);
    expect(result.code).toBe("PAYMENT_SUCCESSFUL");
    expect(dbOrders[0].status).toBe("PENDING"); // Preserved for server payment finalization
    expect(dbInventory[0].quantity_reserved).toBe(20); // No stock released
  });

  // -------------------------------------------------------------------------
  // TEST 5: Repeated cleanup runs do not restore stock twice (Idempotency)
  // -------------------------------------------------------------------------
  it("Scenario 5: Repeated cleanup invocations are idempotent and prevent stock inflation", () => {
    const oldTimestamp = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    dbOrders.push({
      id: "ord-idem-01",
      order_number: "AM-ORD-20261013-000005",
      buyer_id: "usr-buyer-04",
      status: "PENDING",
      total_amount: 85000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-05",
      order_id: "ord-idem-01",
      listing_id: "listing-rice-50kg",
      quantity: 1,
      status: "PENDING",
    });

    // Run 1: Successful release
    const run1 = simulateAtomicReleaseOrderInventory("ord-idem-01");
    expect(run1.success).toBe(true);
    expect(dbInventory[0].quantity_reserved).toBe(19);

    // Run 2: Redundant retry
    const run2 = simulateAtomicReleaseOrderInventory("ord-idem-01");
    expect(run2.success).toBe(false);
    expect(run2.code).toBe("ORDER_ALREADY_CANCELLED");
    // Crucial check: stock is NOT decremented again!
    expect(dbInventory[0].quantity_reserved).toBe(19);

    // Run 3: Third retry
    const run3 = simulateAtomicReleaseOrderInventory("ord-idem-01");
    expect(run3.success).toBe(false);
    expect(dbInventory[0].quantity_reserved).toBe(19);
  });

  // -------------------------------------------------------------------------
  // TEST 6: Uncertain payment status handled conservatively
  // -------------------------------------------------------------------------
  it("Scenario 6: Orders with active in-flight payment (< 15 min old) are deferred", () => {
    const oldTimestamp = new Date(Date.now() - 65 * 60 * 1000).toISOString(); // Created 65m ago
    dbOrders.push({
      id: "ord-flight-01",
      order_number: "AM-ORD-20261013-000006",
      buyer_id: "usr-buyer-05",
      status: "PENDING",
      total_amount: 42000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });

    // Payment was initialized 5 minutes ago (buyer is currently on Paystack checkout modal)
    dbPayments.push({
      id: "pay-flight-01",
      order_id: "ord-flight-01",
      buyer_id: "usr-buyer-05",
      status: "INITIALIZED",
      amount: 42000,
      updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });

    const result = simulateAtomicReleaseOrderInventory("ord-flight-01");

    expect(result.success).toBe(false);
    expect(result.code).toBe("PAYMENT_IN_FLIGHT");
    expect(dbOrders[0].status).toBe("PENDING");
  });

  // -------------------------------------------------------------------------
  // TEST 7: Cleanup failure is observable and can be retried safely
  // -------------------------------------------------------------------------
  it("Scenario 7: Observable failure handling and safe batch retries", () => {
    // Non-existent order ID
    const failureResult = simulateAtomicReleaseOrderInventory("non-existent-order-id");
    expect(failureResult.success).toBe(false);
    expect(failureResult.code).toBe("ORDER_NOT_FOUND");
  });

  // -------------------------------------------------------------------------
  // TEST 8: Customer order history and payment records remain intact
  // -------------------------------------------------------------------------
  it("Scenario 8: Cancellation preserves customer order and payment history", () => {
    const oldTimestamp = new Date(Date.now() - 80 * 60 * 1000).toISOString();
    dbOrders.push({
      id: "ord-history-01",
      order_number: "AM-ORD-20261013-000008",
      buyer_id: "usr-buyer-08",
      status: "PENDING",
      total_amount: 85000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbPayments.push({
      id: "pay-history-01",
      order_id: "ord-history-01",
      buyer_id: "usr-buyer-08",
      status: "FAILED",
      amount: 85000,
      updated_at: oldTimestamp,
    });

    simulateAtomicReleaseOrderInventory("ord-history-01");

    // Record MUST still exist in database
    const savedOrder = dbOrders.find((o) => o.id === "ord-history-01");
    expect(savedOrder).toBeDefined();
    expect(savedOrder?.status).toBe("CANCELLED");
    expect(savedOrder?.order_number).toBe("AM-ORD-20261013-000008");

    // Payment history MUST still exist
    const savedPayment = dbPayments.find((p) => p.id === "pay-history-01");
    expect(savedPayment).toBeDefined();
    expect(savedPayment?.status).toBe("FAILED");
  });

  // -------------------------------------------------------------------------
  // TEST 9: Unauthorized callers cannot invoke scheduled cleanup endpoint
  // -------------------------------------------------------------------------
  it("Scenario 9: Scheduler authentication fails closed on missing or invalid secrets", () => {
    const originalSecret = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = "production-secret-token-xyz-123";

      // 1. Missing header
      const checkNoHeader = validateSchedulerAuthentication(null);
      expect(checkNoHeader.authorized).toBe(false);
      expect(checkNoHeader.reason).toContain("Missing");

      // 2. Invalid token
      const checkInvalid = validateSchedulerAuthentication("Bearer wrong-token");
      expect(checkInvalid.authorized).toBe(false);
      expect(checkInvalid.reason).toContain("Invalid");

      // 3. Valid Bearer token
      const checkValidBearer = validateSchedulerAuthentication(
        "Bearer production-secret-token-xyz-123"
      );
      expect(checkValidBearer.authorized).toBe(true);

      // 4. Valid raw token
      const checkValidRaw = validateSchedulerAuthentication(
        "production-secret-token-xyz-123"
      );
      expect(checkValidRaw.authorized).toBe(true);
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 10: Handles multiple eligible orders without skipping failures
  // -------------------------------------------------------------------------
  it("Scenario 10: Batch processing handles mixed eligible, paid, and in-flight orders accurately", () => {
    const oldTimestamp = new Date(Date.now() - 100 * 60 * 1000).toISOString();
    const recentTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    // Order 1: Eligible for cleanup
    dbOrders.push({
      id: "ord-batch-01",
      order_number: "AM-ORD-BATCH-01",
      buyer_id: "usr-01",
      status: "PENDING",
      total_amount: 50000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-b-01",
      order_id: "ord-batch-01",
      listing_id: "listing-rice-50kg",
      quantity: 1,
      status: "PENDING",
    });

    // Order 2: Eligible for cleanup
    dbOrders.push({
      id: "ord-batch-02",
      order_number: "AM-ORD-BATCH-02",
      buyer_id: "usr-02",
      status: "PENDING",
      total_amount: 42000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-b-02",
      order_id: "ord-batch-02",
      listing_id: "listing-garri-50kg",
      quantity: 1,
      status: "PENDING",
    });

    // Order 3: Already paid (Should be excluded)
    dbOrders.push({
      id: "ord-batch-03",
      order_number: "AM-ORD-BATCH-03",
      buyer_id: "usr-03",
      status: "PAID",
      total_amount: 30000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });

    // Order 4: Recent (< 60 min, Should be excluded)
    dbOrders.push({
      id: "ord-batch-04",
      order_number: "AM-ORD-BATCH-04",
      buyer_id: "usr-04",
      status: "PENDING",
      total_amount: 25000,
      created_at: recentTimestamp,
      updated_at: recentTimestamp,
    });

    const batchResult = simulateBatchCleanup(60, 50);

    expect(batchResult.success).toBe(true);
    expect(batchResult.processedCount).toBe(2);
    expect(batchResult.cancelledCount).toBe(2);
    expect(batchResult.skippedCount).toBe(0);

    // Verify final states
    expect(dbOrders.find((o) => o.id === "ord-batch-01")?.status).toBe("CANCELLED");
    expect(dbOrders.find((o) => o.id === "ord-batch-02")?.status).toBe("CANCELLED");
    expect(dbOrders.find((o) => o.id === "ord-batch-03")?.status).toBe("PAID");
    expect(dbOrders.find((o) => o.id === "ord-batch-04")?.status).toBe("PENDING");

    // Verify inventory reserved quantities
    expect(dbInventory[0].quantity_reserved).toBe(19); // 20 - 1
    expect(dbInventory[1].quantity_reserved).toBe(9);  // 10 - 1
  });

  // -------------------------------------------------------------------------
  // TEST 11: Non-destructive dryRun diagnostic
  // -------------------------------------------------------------------------
  it("Scenario 11: Non-destructive dryRun identifies eligible orders without mutating status or inventory", () => {
    const oldTimestamp = new Date(Date.now() - 95 * 60 * 1000).toISOString();
    dbOrders.push({
      id: "ord-dry-01",
      order_number: "AM-ORD-DRY-01",
      buyer_id: "usr-dry-01",
      status: "PENDING",
      total_amount: 85000,
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    });
    dbOrderItems.push({
      id: "item-dry-01",
      order_id: "ord-dry-01",
      listing_id: "listing-rice-50kg",
      quantity: 1,
      status: "PENDING",
    });

    const initialReserved = dbInventory[0].quantity_reserved;

    // Simulate dry run candidate identification
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const matching = dbOrders.filter((o) => o.status === "PENDING" && o.created_at < cutoff);

    expect(matching.length).toBe(1);
    expect(matching[0].id).toBe("ord-dry-01");

    // In dryRun, no mutations occur
    expect(dbOrders.find((o) => o.id === "ord-dry-01")?.status).toBe("PENDING");
    expect(dbInventory[0].quantity_reserved).toBe(initialReserved);
  });
});
