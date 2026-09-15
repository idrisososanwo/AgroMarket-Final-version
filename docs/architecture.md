# AgroMarket Architecture Guide

## 1. Architectural Style: Modular Monolith

AgroMarket is engineered as a **modular monolith**. 
- Single deployment unit running on Next.js App Router.
- Strict internal boundaries organized by business domain under `src/features/`.
- No premature microservices. Inter-feature communication occurs via typed module interfaces, Server Actions, or domain services.

```
                  ┌────────────────────────────────────────┐
                  │          Next.js App Router            │
                  │   (Root Layout, Route Handlers, Pages) │
                  └───────────────────┬────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
        ┌────────▼────────┐                       ┌────────▼────────┐
        │   Public Layer  │                       │ Protected Layer │
        │  (SSR / Client) │                       │  (Server Guards)│
        └────────┬────────┘                       └────────┬────────┘
                 │                                         │
                 ▼                                         ▼
   ┌────────────────────────────────────────────────────────────────┐
   │                src/features/<domain> Boundaries                │
   │  - auth        - users          - farmers       - farms        │
   │  - products    - marketplace    - cart          - orders       │
   │  - payments    - logistics      - shared-purch. - smart-basket │
   │  - prices      - demand         - jobs          - services     │
   │  - equipment   - knowledge      - notifications - reviews      │
   │  - disputes    - admin          - analytics     - ai           │
   └───────────────────────────────┬────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
          ┌─────────▼─────────┐         ┌─────────▼─────────┐
          │  Supabase (Auth,  │         │ Third-Party APIs  │
          │  Postgres, RLS)   │         │ (Paystack, SMS,   │
          │                   │         │ Logistics Fleet)  │
          └───────────────────┘         └───────────────────┘
```

---

## 2. Server-First Security & Authorization

### 2.1 Principle of Least Privilege
- Privileged database operations must never be exposed to the client or browser.
- Browser client (`src/lib/supabase/client.ts`) utilizes only the publishable `NEXT_PUBLIC_SUPABASE_ANON_KEY` and is constrained by Supabase Row Level Security (RLS).
- Server client (`src/lib/supabase/server.ts`) operates within user session context using HTTP-only cookies.
- Admin client (`src/lib/supabase/admin.ts`) uses `SUPABASE_SERVICE_ROLE_KEY` and is strictly forbidden from being imported or executed in browser bundles.

### 2.2 Server-Side Role Enforcement
- Roles (`BUYER`, `FARMER`, `BUSINESS`, `JOB_SEEKER`, `SERVICE_PROVIDER`, `EQUIPMENT_OWNER`, `EXPERT`, `ADMIN`) are stored in server-managed tables or custom JWT claims (`app_metadata`).
- Roles are NEVER trusted from client state or user-editable profile fields.
- Access guards (`requireAuth`, `requireRole`, `requireAnyRole`) execute on the server during Server Component rendering or Server Action execution.

---

## 3. Core Domain Boundaries & Key Policies

### 3.1 Prohibited Products Policy
- **Absolute Rule**: Pig and pork-derived items (pork meat, bacon, ham, lard, swine breeding stock) are strictly banned from AgroMarket.
- Enforced at both runtime validation layer (`src/features/products/index.ts`) and future database constraints.

### 3.2 Asset-Light Logistics Architecture
- AgroMarket does not own physical logistics assets (trucks, cold rooms, warehouses).
- The `logistics` domain acts as an integration gateway connecting orders to vetted third-party Nigerian haulage and delivery providers.

### 3.3 Nigerian Fiat Payment Foundation
- Designed for seamless integration with Nigerian payment processors (Paystack, Flutterwave, Monnify).
- Escrow architecture holds funds until buyer confirms receipt and the 7-day quality inspection window expires.
- Operating currency is exclusively Nigerian Naira (NGN). Crypto assets and non-fiat tokens are strictly excluded.

### 3.4 AI Safety Service Layer
- AI (`src/features/ai`) is strictly an advisory service layer.
- Must not provide authoritative medical, veterinary, or pesticide safety certifications.
- All agronomic AI outputs include safety advisories urging confirmation with extension workers.

---

## 4. Error Handling and Observability

- Standardized typed errors via `src/lib/errors/app-error.ts` (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`).
- Next.js error boundaries (`error.tsx`, `global-error.tsx`) capture client-side and root-level exceptions.
- Structured JSON health check API available at `/api/health`.

---

## 5. Database & Domain Models Architecture (Phase 0.2)

- **Unified Schema Reference**: Detailed table specifications, columns, and foreign keys are documented in [docs/database.md](database.md).
- **Relational Integrity**: 32 core relational tables spanning 19 domain sectors.
- **Inventory Engine**: Relational check constraints enforce `quantity_on_hand >= quantity_reserved` with auto-calculated `quantity_available`.
- **Multi-Seller Order Splitting**: Orders record line items with explicit `seller_id`, enabling split fulfillment without data corruption.
- **Strict Anti-Pork Constraints**: Guaranteed via PostgreSQL regex CHECK constraints on `categories` and `products`.
- **Append-Only Auditing**: `audit_logs` table records administrative and critical actions without allowing updates or deletions.

---

## 6. Authentication, User Onboarding & RBAC Architecture (Phase 0.3)

### 6.1 Authentication Flows
- **Supabase Auth**: Cryptographic session tokens with PKCE and HTTP-only cookie exchange via `@supabase/ssr`.
- **Public Auth Routes**: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify`.
- **Two-Tier Route Protection**:
  1. **Edge Middleware (`src/middleware.ts`)**: Session refresh, unauthenticated redirection from protected paths, and authenticated redirection away from auth pages.
  2. **Server Guards (`src/lib/auth/server.ts`)**: Cryptographic session assertion with database-backed permission validation (`requireAuth()`, `requireRole()`, `requireAnyRole()`, `requireOnboarded()`).

### 6.2 Authoritative Role Management & Onboarding
- **Database-Backed Truth**: Roles are loaded from PostgreSQL (`public.user_roles`) during server request rendering, never trusted from client state.
- **Onboarding Flow (`/onboarding`)**: Collects Nigerian contact details (State, LGA, Phone) and allows users to self-select multi-role participation (`BUYER`, `FARMER`, `BUSINESS`, `JOB_SEEKER`, `SERVICE_PROVIDER`, `EQUIPMENT_OWNER`, `EXPERT`).
- **Strict Anti-Self-Promotion**: `ADMIN` is strictly excluded from `SELF_ASSIGNABLE_ROLES`. Attempts to inject `ADMIN` into onboarding payloads are rejected with security errors.
- **Account Area (`/account`)**: Allows users to inspect their assigned roles, view verification status, update permitted profile details, and securely log out.

---

## 7. Core Marketplace Catalog, Seller Listings & Inventory Architecture (Phase 0.4)

### 7.1 Canonical Products vs. Seller Listings Separation
- **Canonical Product (`public.products`)**: Authoritative definition of *what produce is* (e.g., White Maize, Roma Tomatoes, Broiler Chicken, Cassava Tubers). Managed canonically and protected by category-level anti-pork database constraints.
- **Seller Listing (`public.listings`)**: A specific farmer or agribusiness's commercial offering tied to a canonical product. Contains pricing in Nigerian Naira (`price_per_unit`), unit of measurement, minimum order quantity (MOQ), and physical farm/warehouse pickup location.

### 7.2 Strict Seller Authorization & Ownership
- **Role Requirement**: Only users with `FARMER` or `BUSINESS` roles can create or modify listings (`requireAnyRole(["FARMER", "BUSINESS"])`).
- **Ownership Verification**: All listing updates, status transitions, and inventory modifications verify `listing.seller_id === auth.uid()` on the server and are backed by database RLS policies.

### 7.3 Status Lifecycle State Machine
Listings progress through a controlled state machine:
- `DRAFT` ➔ `ACTIVE` | `ARCHIVED`
- `ACTIVE` ➔ `PAUSED` | `OUT_OF_STOCK` | `ARCHIVED`
- `PAUSED` ➔ `ACTIVE` | `ARCHIVED`
- `OUT_OF_STOCK` ➔ `ACTIVE` | `ARCHIVED`
- `ARCHIVED` ➔ `[Terminal State]` (No modifications permitted)

### 7.4 Non-Negative Inventory Engine
- Physical stock is managed in `public.inventory`.
- `quantity_available` is auto-computed as `quantity_on_hand - quantity_reserved`.
- Enforces strict invariant: `quantity_on_hand >= quantity_reserved`, guaranteeing overselling is impossible. Sellers cannot reduce stock below currently reserved orders.

### 7.5 Server-Side Catalog Discovery & Filtering
- All discovery queries (`getMarketplaceListings`) execute on PostgreSQL with server-side pagination, text search (`ilike`), category filter, Nigerian state filter, price range (min/max), and sorting.
- Entire catalogs are never transmitted to client browsers.

---

## 8. Cart & Order Foundation Architecture (Phase 0.5)

### 8.1 Server-Authoritative Multi-Seller Cart
- **Persistent Storage**: Buyer carts are stored server-side in `public.carts` and `public.cart_items`, keyed to the buyer's authenticated UUID.
- **Client Trust Zero**: Client-supplied unit prices, currency codes, subtotals, and totals are strictly rejected. All calculations (item subtotal, cart total, delivery fees) are computed on the server from PostgreSQL listing data.
- **Multi-Seller Coexistence**: Items from multiple distinct sellers coexist seamlessly in a single cart without collapsing or overwriting each other. The UI groups items by seller for clear visual separation.

### 8.2 Atomic Order Creation & Inventory Reservation
- **Concurrency Control**: Implemented via PostgreSQL stored procedure `public.create_order_from_cart(p_buyer_id, p_delivery_address, p_notes)`.
- **Pessimistic Locking**: Obtains row-level `FOR UPDATE` locks on `carts`, `cart_items`, `listings`, and `inventory` to eliminate race conditions and double-spending of inventory.
- **Inventory Safety Invariant**: Atomic validation verifies that requested quantity `<= (quantity_on_hand - quantity_reserved)`. Upon order creation, `quantity_reserved` is atomically incremented, reserving stock without premature deduction until fulfillment.
- **Atomic Cart Clearing**: The buyer's cart items are wiped within the same atomic transaction upon successful order creation.

### 8.3 Immutable Order Snapshots
- Orders store point-in-time financial and product snapshots in `public.order_items`:
  - `product_name_snapshot`: Exact product name at time of purchase.
  - `unit_price_snapshot`: Exact unit price in Nigerian Naira at checkout.
  - `unit_snapshot`: Unit of measurement (e.g., 50kg Bag, Crate, Tuber).
  - `total_price`: Authoritative line item total.
  - `seller_id`: Scoped seller identification for fulfillment.
- Subsequent changes to seller listings, price adjustments, or product deprecation have zero impact on historical order receipts.

### 8.4 Controlled Order Lifecycle State Machine
Orders and line items transition through a strictly enforced state machine:
- `PENDING` ➔ `PAID` | `CANCELLED`
- `PAID` ➔ `PROCESSING` | `CANCELLED`
- `PROCESSING` ➔ `COMPLETED` | `CANCELLED`
- `COMPLETED` ➔ `[Terminal State]`
- `CANCELLED` ➔ `[Terminal State]`
- When an order transitions to `CANCELLED`, reserved inventory is automatically released back to available stock (`quantity_reserved -= quantity`).

---

## 9. Payments & Payment Verification Architecture (Phase 0.6)

### 9.1 Provider-Agnostic Core
- The core order and commerce domain is fully isolated from third-party gateway specificities through the `PaymentProvider` interface and `PaymentService`.
- Providers are dynamically resolved via `getPaymentProvider(name)`:
  - **Paystack (`PaystackProvider`)**: Fully verified primary Nigerian fiat gateway. Normalizes NGN order amounts to Kobo ($\times 100$) and normalizes Kobo back to NGN ($\div 100$).
  - **Flutterwave (`FlutterwaveProvider`)**: Standardized NGN adapter contract implementing `PaymentProvider`.
  - Future gateways implement this identical interface without touching the orders domain. Pure NGN fiat only.

### 9.2 Zero-Trust Server-Authoritative Verification
- Client-supplied prices, totals, currencies, and payment statuses are strictly ignored.
- The only authorized pathway to mark an order as `PAID` is server-to-server cryptographic verification with the provider or authenticated webhook signature verification.
- Amount verification enforces exact equality ($|\text{expected} - \text{verified}| \le 0.01$). Any mismatch marks the payment `FAILED`, logs a fraud alert, and halts order advancement.
- Currency verification mandates `NGN`.

### 9.3 Cryptographic Webhook Authentication & Database Idempotency
- Incoming Paystack webhooks are validated via `crypto.timingSafeEqual` against the HMAC-SHA512 digest of the raw request body using `PAYSTACK_SECRET_KEY` / `PAYSTACK_WEBHOOK_SECRET`.
- Webhook events are journaled in `public.payment_webhook_events` under a unique constraint `(provider, event_id)`. Duplicate webhook deliveries are safely acknowledged with `200 OK` ("Event already processed") without duplicate state mutations.

### 9.4 Payment Attempt Lifecycle vs. Order Status
- Orders begin in `PENDING`.
- Failed payment attempts transition `payments.status` to `FAILED`, but keep the order in `PENDING` with reserved inventory intact, allowing the buyer to retry checkout.
- Successful payments atomically update `payments.status = 'SUCCESSFUL'` and transition `orders.status = 'PAID'`.

---

## 10. Logistics & Delivery Coordination Architecture (Phase 0.7)

### 10.1 Asset-Light 3PL Platform Model
- AgroMarket owns zero physical logistics assets (no trucks, motorcycles, warehouses, or cold rooms).
- The platform functions as a digital orchestrator matching verified agricultural produce orders with third-party logistics carriers (3PLs).

### 10.2 Multi-Seller Consignment Partitioning
- Orders containing produce from multiple independent farmers or agribusinesses partition into distinct delivery records in `public.deliveries`.
- Each consignment manages its own pickup location, carrier assignment, tracking number (`AM-DLV-YYYYMMDD-XXXXXX`), and status lifecycle.
- Sellers enjoy total isolation: a seller can inspect only their own farm dispatches.

### 10.3 Strict Governed Transit Lifecycle
- Consignments progress through a server-authoritative state machine:
  `PENDING` ➔ `QUOTED` ➔ `ASSIGNED` ➔ `PICKUP_SCHEDULED` ➔ `PICKED_UP` ➔ `IN_TRANSIT` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED`.
- Deliveries cannot be initiated for unpaid (`PENDING`) or cancelled orders.
- Cancellation is forbidden once produce has been picked up from the farm.
- All delivery events are immutably journaled in `public.delivery_events`.
- When all consignments for an order reach `DELIVERED`, the master order transitions to `COMPLETED`.

---

## 11. Disputes, Refunds & Settlement Accounting (Phase 0.8)

### 11.1 Multi-Seller Settlement Partitioning
- Orders with $N$ independent farmers automatically partition into $N$ distinct settlement ledgers in `public.settlements`.
- Guaranteed uniqueness via `CONSTRAINT uq_settlement_order_seller UNIQUE (order_id, seller_id)`.
- Sellers enjoy strict isolation: a farmer can view only their own settlement statements, platform deductions, and dispute cases.

### 11.2 Fulfilment Holds & Dispute Eligibility Window
- AgroMarket operates internal fulfillment milestones rather than a regulated escrow trust.
- Settlement funds remain in `PENDING` hold until:
  1. Parent order has received verified payment (order status is `PAID`, `PROCESSING`, `PARTIALLY_FULFILLED`, or `COMPLETED`). In a multi-seller order, a seller whose goods have delivered does not wait for other sellers to finish.
  2. All consignments for this seller have reached `DELIVERED` status with `actual_delivery_date`.
  3. No delivery record for this seller is in `DELIVERY_FAILED` status.
  4. Zero disputes for that seller/consignment are in `OPEN` or `UNDER_REVIEW` status.
  5. The mandatory 7-day quality inspection window (`DEFAULT_DISPUTE_WINDOW_DAYS = 7`) has elapsed.
- Once all conditions are satisfied, the settlement transitions to `ELIGIBLE` for automated or admin disbursement.
- Valid seller settlements do not alter overall order status; master order completion requires full fulfillment of all consignments.

### 11.3 Disputes & Arbitration Engine
- Buyers can report quality issues, transport damage, or weighbridge deficits for specific items or consignments.
- Disputes follow a server-enforced state machine: `OPEN` ➔ `UNDER_REVIEW` ➔ `RESOLVED` / `REJECTED` ➔ `CLOSED`.
- Administrative rulings can award gateway refunds, deduct penalties from the seller's settlement ledger, or reject unfounded claims.

### 11.4 Pure NGN Fiat Financial Foundation
- All financial ledgers, refunds, holds, and disbursements operate strictly in Nigerian Naira (NGN).
- Crypto assets and non-fiat instruments are barred from the transaction pipeline.

---

## 12. Market Intelligence, Regional Prices & Demand Forecasting (Phase 0.9)

### 12.1 Append-Only Commodity Price Observations
- Market price observations are recorded in `public.price_observations` with location (State & LGA), market name, reported price, unit, and verification metadata.
- Records are strictly append-only: previous observations are never overwritten, enabling 30/60/90-day longitudinal trend analysis.
- RLS enforces safe public visibility of verified/system-derived records while restricting moderation to platform administrators.

### 12.2 Deterministic Unit Normalization
- Standard trade units (`50kg Bag`, `100kg Bag`, `25kg Bag`, `Tonne (MT)`, `Gallon (25L)`, etc.) are mathematically converted to canonical base units (`KG` or `LITRE`).
- Indeterminate and variable units (`Basket`, `Crate`, `Bunch`, `Piece`, `Head`) are safely flagged with `normalization_status = 'UNAVAILABLE'` rather than inventing unverified conversion factors.

### 12.3 Regional Comparison & Safe Presentation
- State-by-state aggregation computes min, max, average, and data sufficiency (`LOW_DATA`, `MODERATE`, `HIGHER_CONFIDENCE`).
- Contextual phrasing prevents misleading national superlatives when data is sparse (e.g., *"Lowest observed price among available records"*).

### 12.4 Platform Demand Signals & Baseline Moving-Average Forecasting
- Demand signals query authentic completed order receipts (`order_items`, `orders`) and active staged interest (`cart_items`).
- Baseline forecasting employs a deterministic 30-day moving average projected over a 7-day horizon.
- Zero fake AI policy: transparently labeled as a statistical baseline with explicit limitation notes and data sufficiency classifications (`LOW`, `MEDIUM`, `HIGH`, `INSUFFICIENT_DATA`).

---

## 13. Smart Basket Recommendation Engine (Phase 1.0)

### 13.1 Pluggable Provider Architecture
- Domain orchestrator decoupled behind `RecommendationProvider` interface: `SmartBasketService` ➔ `SmartBasketRecommendationEngine` ➔ `DeterministicRecommendationProvider`.
- Enables seamless pluggability for future machine-learning models or personalized recommenders without altering cart checkout flows.

### 13.2 Transparent Scoring & Greedy Knapsack Allocation
- Evaluates live marketplace listings across five verifiable criteria: Preference match (+35 max), State proximity (+25 max), Value vs regional benchmark (+20 max), Inventory depth (+15 max), and Nutritional diversity (+15 max).
- Uses greedy knapsack allocation to fit items within the buyer's stated budget without silently exceeding constraints.
- Generates data-grounded, verifiable explanations for every item recommendation.

### 13.3 Server-Authoritative Cart Integration
- Smart Basket never bypasses the cart: adding recommendations to the cart re-validates each listing's active status, current inventory, MOQ, and authoritative unit price from the database.
- Strictly ignores client-supplied pricing or synthetic discounts.

### 13.4 Strict Policy Enforcements
- Non-negotiable Zero-Pork filter blocks all porcine produce from recommendations and cart insertion.
- Non-medical boundary: logistical food purchasing assistance, strictly non-medical guidance.

---

## 14. Shared Purchase & Bulk Splitting (Phase 1.1)

### 14.1 Collective Wholesale Demand Pooling
- Enables multiple buyers to collectively commit to bulk farm crops (`BULK_CROP`) or livestock portions (`ANIMAL_PORTION`).
- Allows consumers, restaurants, and aggregators to access farm-gate pricing without individually purchasing unmanageable volumes.

### 14.2 Dual Purchase Models & Livestock Portions
- **Bulk Crop Split**: Grains, legumes, tubers, and vegetables allocated by standard or discrete units (`kg`, `50kg Bag`, `Basket`, `Tuber`).
- **Livestock Portion Sharing**: Supports `FRACTIONAL` (e.g. 1/4, 1/2 ram) and `WEIGHT_BASED` (e.g. 80kg cow split by kg).
- Strictly preserves seller-declared units and weights without synthetic or speculative yield conversions.

### 14.3 Atomic Concurrency & Over-Allocation Prevention
- Implements PostgreSQL row-level locks via `allocate_shared_purchase_participant` using `SELECT ... FOR UPDATE`.
- Enforces an immutable database constraint `CONSTRAINT chk_allocated_not_exceed_total CHECK (allocated_quantity <= total_quantity)` preventing concurrent over-allocation.
- Authoritative remaining quantity is calculated via stored generated column: `remaining_quantity = total_quantity - allocated_quantity`.

### 14.4 Listing Inventory Ring-Fencing
- When a seller creates an active shared purchase, the `target_quantity` is immediately reserved in the listing's inventory (`quantity_reserved += target_quantity`).
- Eliminates overselling and prevents double-reservation between marketplace cart checkouts and active shared pools.
- If a pool is cancelled or expires without reaching target, unfulfilled reserved stock is cleanly released.

### 14.5 Participant-Level Order & Payment Isolation
- Each participant's join generates an individual `orders` record linked to `shared_purchases` via `shared_purchase_id`.
- Reuses Phase 0.6 `PaymentService` for Paystack and Flutterwave payments in pure NGN fiat.
- Disputes and refunds are strictly isolated to the affected participant's order via `RefundService`, preventing cross-participant financial leakage.
- Seller settlement calculations remain cleanly partitioned per seller.

### 14.6 Strict Anti-Pork / Halal Enforcement
- Database-level regex check constraint on `shared_purchases.title` and `shared_purchases.description`.
- Comprehensive application-level validation via `containsProhibitedProduce` rejecting any swine/pork terms across all pool attributes, notes, and candidate listings.



