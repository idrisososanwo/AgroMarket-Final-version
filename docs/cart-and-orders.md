# AgroMarket Cart & Order Domain Guide (Phase 0.5)

This document provides a comprehensive operational and architectural guide to the **Cart & Order Foundation** in AgroMarket.

---

## 1. Executive Summary

AgroMarket's Phase 0.5 implements the core transactional pipeline:
$$\text{BUYER} \longrightarrow \text{CART} \longrightarrow \text{ORDER}$$

Key tenets:
1. **Server-Authoritative**: The client cannot specify unit prices, subtotals, or order totals. All calculations are executed on the server from PostgreSQL data.
2. **Multi-Seller Coexistence**: Items from distinct farmers and agribusinesses coexist seamlessly in one shopping cart.
3. **Atomic Concurrency & Non-Negative Inventory**: Order placement uses pessimistic row locks (`FOR UPDATE`) to reserve inventory and clear cart items atomically without race conditions.
4. **Historical Snapshots**: Order line items freeze produce names and unit prices at purchase time, isolating order history from listing edits.
5. **Controlled Lifecycle**: Orders follow an immutable-after-completion state machine with automatic inventory release on cancellation.
6. **Prohibited Produce Enforcement**: Strict database constraints and runtime validation ban all pig and pork items.

---

## 2. Cart Architecture & Multi-Seller Design

### 2.1 Database Entities
- **`carts`**:
  - Primary Key: `id` (UUID)
  - Foreign Key: `buyer_id` (UUID references `auth.users`)
  - Unique Constraint: `(buyer_id)` — One persistent active cart per buyer.
- **`cart_items`**:
  - Primary Key: `id` (UUID)
  - Foreign Keys: `cart_id` (`carts`), `listing_id` (`listings`), `seller_id` (`profiles`)
  - Unique Constraint: `(cart_id, listing_id)` — Ensures adding the same listing increments quantity rather than creating duplicate lines.

### 2.2 Multi-Seller Coexistence
- If a buyer adds White Maize from *Alhaji Ibrahim Farms (Kano)* and White Maize from *Ogun State Grains Cooperative*, they represent distinct listings (`listing_id_1`, `listing_id_2`) with distinct seller IDs.
- Both line items exist side-by-side in the cart.
- The UI groups cart items by `sellerId` and displays seller badges, farm locations, and individual item subtotals.

### 2.3 Server-Side Stock Limits
- `getBuyerCart(userId)` calculates `availableStock = quantity_on_hand - quantity_reserved` for each item.
- If a listing's available stock is lower than the cart quantity, the system surfaces stock warnings and caps checkout.
- Cart actions (`addToCartAction`, `updateCartItemAction`) validate `quantity <= availableStock` and `quantity >= min_order_quantity`.

---

## 3. Atomic Order Placement (`create_order_from_cart`)

### 3.1 PostgreSQL Function
Order creation is executed through the stored procedure `public.create_order_from_cart`:

```sql
SELECT * FROM public.create_order_from_cart(
  p_delivery_address => '14 Commercial Avenue, Sabo, Yaba',
  p_delivery_state => 'Lagos',
  p_delivery_lga => 'Lagos Mainland',
  p_contact_phone => '+2348012345678',
  p_delivery_notes => 'Call before dispatch'
);
```

### 3.2 Transaction Lifecycle
1. **Lock Cart**:
   `SELECT id FROM public.carts WHERE buyer_id = v_buyer_id FOR UPDATE;`
2. **Lock & Validate Cart Items**:
   Reads all `cart_items` for the buyer. If empty, throws an exception.
3. **Lock Listings & Inventory**:
   `SELECT ... FROM public.listings l JOIN public.inventory i ON i.listing_id = l.id WHERE ... FOR UPDATE;`
4. **Enforce Business Invariants**:
   - Verify listing is `ACTIVE`.
   - Verify `quantity >= min_order_quantity`.
   - Verify `quantity <= (quantity_on_hand - quantity_reserved)`. Throws error if insufficient stock.
5. **Create Order Record**:
   - Computes `order_number` (e.g. `AGRO-20260911-XXXXX`).
   - Inserts into `public.orders` with `status = 'PENDING'` and server-computed `total_amount`.
6. **Create Order Snapshots**:
   - Inserts into `public.order_items`:
     - `product_name_snapshot = p.title`
     - `unit_price_snapshot = l.price_per_unit`
     - `unit_snapshot = l.unit`
     - `total_price = l.price_per_unit * item.quantity`
     - `seller_id = l.seller_id`
7. **Reserve Inventory**:
   `UPDATE public.inventory SET quantity_reserved = quantity_reserved + item.quantity WHERE listing_id = item.listing_id;`
8. **Clear Cart**:
   `DELETE FROM public.cart_items WHERE cart_id = v_cart_id;`
9. **Return**:
   Returns `{ order_id, order_number }`.

---

## 4. Order State Machine

Orders and their constituent items transition through a strictly governed lifecycle:

```
                  ┌──────────────┐
                  │   PENDING    │
                  └──────┬───────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   ┌─────────────┐               ┌─────────────┐
   │    PAID     │               │  CANCELLED  │◄─── (From PENDING,
   └──────┬──────┘               └─────────────┘      PAID, or
          │                             ▲             PROCESSING)
          ▼                             │
   ┌─────────────┐                      │
   │ PROCESSING  ├──────────────────────┘
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  COMPLETED  │ (Terminal Success)
   └─────────────┘
```

### 4.1 Permitted Transitions
| From | To | Authorized Actor | Notes |
| :--- | :--- | :--- | :--- |
| `PENDING` | `PAID` | System / Payment | Simulates or marks receipt of funds |
| `PENDING` | `CANCELLED` | Buyer / Seller / Admin | Automatically releases reserved inventory |
| `PAID` | `PROCESSING` | Seller / Admin | Farmer accepts and prepares dispatch |
| `PAID` | `CANCELLED` | Buyer / Seller / Admin | Releases reserved inventory; initiates refund workflow |
| `PROCESSING`| `COMPLETED` | Seller / Buyer / Admin | Consignment delivered and confirmed |
| `PROCESSING`| `CANCELLED` | Admin / Seller | Permitted only for disputed dispatches |
| `COMPLETED` | *None* | *None* | Terminal state. No further transitions |
| `CANCELLED` | *None* | *None* | Terminal state. No further transitions |

### 4.2 Inventory Release on Cancellation
Whenever an order transitions to `CANCELLED`, `transitionOrderStatusAction` executes:
```sql
UPDATE public.inventory
SET quantity_reserved = GREATEST(0, quantity_reserved - item.quantity)
WHERE listing_id = item.listing_id;
```
This restores available stock (`quantity_available = quantity_on_hand - quantity_reserved`) immediately without double-counting.

---

## 5. Security & Authorization

1. **Authentication Required**:
   - `/cart` redirects unauthenticated users to `/auth/login?redirectTo=/cart`.
   - `/account/orders` and `/account/orders/[orderId]` require authenticated session.
   - `/farmer/orders` requires `FARMER` or `BUSINESS` role (`requireAnyRole(["FARMER", "BUSINESS"])`).
2. **Data Isolation**:
   - Buyers can ONLY see orders where `buyer_id = auth.uid()`.
   - Sellers viewing `/farmer/orders` can ONLY see `order_items` where `seller_id = auth.uid()`. They never see other sellers' items or financials from the same master order.
3. **RLS Policies**:
   - `cart_items_insert_own_cart`: Verified through `carts.buyer_id = auth.uid()`.
   - `order_items_select_seller`: Permitted if `seller_id = auth.uid()`.
   - `orders_update_own_pending`: Buyers can only cancel their own orders while in `PENDING`.

---

## 6. Prohibited Produce Policy

AgroMarket strictly prohibits pig/pork products across all layers:
- Database schema: `chk_no_pork_category`, `chk_no_pork_product`
- Validation layer: `containsProhibitedProduce()` regex checks (`pork`, `pig`, `swine`, `hog`, `bacon`, `ham`, `lard`)
- Unit tests: Automated verification in `src/test/cart-orders.test.ts`.

---

## 7. Next Steps (Deferred to Later Phases)

The following capabilities are deliberately out-of-scope for Phase 0.5:
- Nigerian Payment Gateway Integration (Paystack, Flutterwave, Monnify, Bank Transfer in NGN) — Phase 0.6+
- Delivery Fleet & Courier API dispatch — Phase 0.7+
- Shared Purchases & Smart Basket Checkout integration — Future Phases

