# Shared Purchase Domain Documentation

## 1. Overview & Objective

Shared Purchase is a collective buying capability engineered for the Nigerian agricultural food ecosystem. It enables multiple consumers, households, and hospitality businesses to pool demand and split wholesale harvests or whole livestock at farm-gate rates.

Typical use cases:
1. **Bulk Crop Splitting**: Splitting 500kg or multiple 50kg bags of maize, parboiled rice, beans, or garri among 5–10 buyers.
2. **Livestock Portion Sharing**: Grouping buyers to purchase defined portions (e.g. 1/4, 1/2) of a live ram, cow, or goat, coordinated through verified pickup hubs or direct drop-offs.

---

## 2. Purchase Types & Domain Model

The domain supports two primary purchase types:

### A. `BULK_CROP`
- Used for staple crops, grains, tubers, and vegetables sold by weight or discrete agricultural units (e.g., `kg`, `50kg Bag`, `Basket`, `Tuber`).
- Buyers commit quantities between `min_share_quantity` and `max_share_quantity` until `allocated_quantity == total_quantity`.

### B. `ANIMAL_PORTION`
- Used for shared livestock purchases (e.g. ram, cow, goat).
- Supports two allocation modes:
  1. **`FRACTIONAL`**: Defined fractions such as `1/4` (Quarter Ram), `1/2` (Half Ram), or custom slots where the sum of fractions cannot exceed 1.0 (whole animal).
  2. **`WEIGHT_BASED`**: Split by declared live or carcass weight in kilograms (e.g., 80kg cow split into 20kg, 30kg, 30kg).
- **Yield Safety Rule**: The system strictly avoids making unverified claims about edible meat yield, bone ratios, or slaughter loss. Seller-declared units and weights are preserved natively.

---

## 3. Server-Authoritative State Machine

Shared purchase pools follow an explicit server-controlled lifecycle:

```
[DRAFT]
   │
   ▼
[OPEN] ───────────────┬───────────────┐
   │                  │               │
   ▼                  ▼               ▼
[TARGET_REACHED] ──> [PAYMENT_PENDING] [CANCELLED] / [EXPIRED]
   │                  │
   └──────────────────┤
                      ▼
                 [CONFIRMED]
                      │
                      ▼
                 [FULFILMENT]
                      │
                      ▼
                 [COMPLETED]
```

### Transition Table
| State | Allowed Next States | Description |
|---|---|---|
| `DRAFT` | `OPEN`, `CANCELLED` | Seller is preparing the pool; hidden from public catalog. |
| `OPEN` | `TARGET_REACHED`, `PAYMENT_PENDING`, `CANCELLED`, `EXPIRED` | Active for buyers to pledge shares. |
| `TARGET_REACHED` | `PAYMENT_PENDING`, `CONFIRMED`, `CANCELLED` | 100% of target quantity has been committed. |
| `PAYMENT_PENDING` | `CONFIRMED`, `CANCELLED`, `EXPIRED` | Committed buyers are completing checkout payments. |
| `CONFIRMED` | `FULFILMENT`, `CANCELLED` | Target quantity is funded and confirmed for dispatch. |
| `FULFILMENT` | `COMPLETED`, `CANCELLED` | Produce is dispatched or available at pickup hub. |
| `COMPLETED` | (Terminal) | All participants have received their shares. |
| `CANCELLED` | (Terminal) | Cancelled by seller/admin; paid buyers refunded. |
| `EXPIRED` | (Terminal) | Closing date passed before target reached; unpaid pledges voided. |

---

## 4. Concurrency & Over-Allocation Strategy

To prevent race conditions where concurrent buyers over-allocate limited pool capacity:
1. **Row-Level Locking**: The PostgreSQL stored procedure `allocate_shared_purchase_participant` locks the `shared_purchases` row using `SELECT ... FOR UPDATE`. All concurrent transactions serialize at the database engine level.
2. **Database Constraint Barrier**: A database engine check constraint `CONSTRAINT chk_allocated_not_exceed_total CHECK (allocated_quantity <= total_quantity)` violently rejects any transaction that attempts to exceed target capacity.
3. **Authoritative Calculation**: Remaining quantity is a stored generated column: `remaining_quantity NUMERIC(12, 2) GENERATED ALWAYS AS (total_quantity - allocated_quantity) STORED`. Client-supplied remaining values are never trusted.

---

## 5. Inventory Ring-Fencing

To ensure stock is never double-sold between standard marketplace checkout and shared purchases:
- When a seller creates an active shared purchase, the required `target_quantity` is immediately reserved on the listing's inventory:
  `inventory.quantity_reserved = inventory.quantity_reserved + target_quantity`
- Regular cart checkouts cannot consume this reserved stock.
- If a shared purchase is cancelled or expires without reaching target, the unfulfilled reserved quantity is cleanly released back.

---

## 6. Order & Payment Integration

The architecture uses **Option B (Participant-Level Order Generation)**:
- When a buyer joins an open pool, an individual `orders` record is created with `shared_purchase_id` referencing the pool.
- An individual `order_items` record captures the snapshot price, quantity, and produce details.
- Each buyer initializes payment independently via Phase 0.6 `PaymentService` (`Paystack` or `Flutterwave`) for their authoritative share amount in NGN.
- Webhooks and verification callbacks transition the individual order to `PAID`, triggering `SharedPurchaseService.handleParticipantPaymentSuccess`.
- When all participants in the pool are paid, the pool transitions to `CONFIRMED`.

---

## 7. Dispute, Refund & Settlement Isolation

- **Refund Isolation**: If Participant A opens a dispute or requests a cancellation refund, `RefundService.processFullRefund` operates strictly against Participant A's payment and order. Other participants (B, C, D) remain unaffected.
- **Settlement Isolation**: Phase 0.8 `SettlementService` computes seller payouts based on paid order items, ensuring seller accounting is strictly partitioned without pool cross-contamination.

---

## 8. Strict Anti-Pork / Halal Safeguards

AgroMarket enforces an absolute non-pork food policy:
- **Database Engine Check**: `shared_purchases` includes `CONSTRAINT chk_no_pork_shared_purchases CHECK (title !~* '\y(pork|pig|swine|bacon|ham|lard)\y' AND (description IS NULL OR description !~* '\y(pork|pig|swine|bacon|ham|lard)\y'))`.
- **Application Zod Validation**: All creation, join notes, and portion names are verified against `PORK_PROHIBITED_REGEX`.
- **Candidate Filtering**: Listings and products with prohibited produce terms are rejected at the service layer.

---

## 9. Post-Audit Integrity Hardening (Phase 1.1 Audit Fixes)

1. **Duplicate Join Prevention**:
   - `public.allocate_shared_purchase_participant` locks the existing participant record. If an active pledge exists (`PLEDGED` or `PAYMENT_PENDING`), the transaction is rejected with an explicit error to prevent allocation inflation and orphaned orders.
   - Rejoining after a prior cancellation is safely supported without double-counting.
2. **Stale Unpaid Pledge Expiration**:
   - `public.expire_stale_shared_purchase_pledges` automatically purges abandoned pledges older than TTL (default 30 minutes), cancels pending orders, reclaims allocated quantity, and reopens `TARGET_REACHED` pools back to `OPEN`.
3. **Cancellation Order Synchronization**:
   - `SharedPurchaseService.cancelSharedPurchase` transitions participant orders to `CANCELLED` when refunds are processed, preventing invalid `Order PAID + Shared Purchase CANCELLED` combinations.
4. **Funding Verification Before CONFIRMED/FULFILMENT**:
   - Server-side guards in `SharedPurchaseService.transitionStatus` disallow transitioning to `CONFIRMED` or `FULFILMENT` unless `totalPaidQuantity >= total_quantity` and zero active participants remain unpaid.
5. **Fractional Portion Sum Validation**:
   - `createSharedPurchaseSchema` enforces that pre-declared animal portions cannot exceed 1.0 (100% of animal).
6. **Atomic Inventory Reservation**:
   - `public.reserve_shared_purchase_stock` locks `public.inventory` using `SELECT ... FOR UPDATE` to eliminate race conditions between concurrent pool creations.
7. **Unique Participant Order Constraint**:
   - `uq_sp_participants_order_id` guarantees 1:1 participant to order integrity at the database engine level.

