# AgroMarket Database Architecture & Schema Specification (Phase 0.2)

This document provides the authoritative database reference for **AgroMarket**. It describes the relational schema, security policies, data integrity constraints, and domain models implemented in PostgreSQL and Supabase.

---

## 1. High-Level Architectural Principles

1. **Unified Relational Core**: One coherent PostgreSQL database managed via Supabase; zero microservice databases.
2. **UUID Primary Keys**: Every primary key uses UUID (`gen_random_uuid()`) for decentralized, collision-proof ID generation.
3. **UTC Timestamps**: All timestamps use `TIMESTAMPTZ` with `timezone('utc'::text, now())` defaults.
4. **Strict Monetary Representation**: Monetary amounts are stored as `NUMERIC(14, 2)` with explicit `currency` (default `'NGN'`). Floating-point types are strictly forbidden.
5. **Mandatory Row Level Security (RLS)**: Enabled across all 32 tables with least-privilege policies.
6. **No-Pork Schema Rule**: Enforced by database `CHECK` constraints on categories and products (`chk_no_pork_category`, `chk_no_pork_product`).

---

## 2. Domain Entities & Relationships

```
Profiles (Users) ──────┬────── User Roles (Multi-Role RBAC)
                       ├────── Business Profiles (CAC / Corporate)
                       ├────── Verification Records (NIN / BVN / KYC)
                       ├────── Farms ────── Farm Products ─── (Canonical Products)
                       ├────── Listings ──── Inventory (Non-Negative Stock)
                       ├────── Carts ────── Cart Items (Multi-Seller)
                       ├────── Orders ───── Order Items (Historical Snapshot)
                       ├────── Payments (Nigerian Fiat / Escrow)
                       ├────── Shared Purchases ─── Participants
                       ├────── Jobs ────── Job Applications
                       ├────── Services ─── Service Requests
                       ├────── Equipment ── Equipment Rentals
                       ├────── Reviews (Relational Target References)
                       ├────── Disputes (Order/Escrow Arbitration)
                       ├────── AI Conversations ── AI Messages
                       ├────── Notifications (Multi-Channel)
                       └────── Audit Logs (Append-Only Immutable Ledger)
```

---

## 3. Detailed Domain Model Catalog

### 3.1 Identity, Access & Profiles
- **`roles`**: Canonical registry of 8 system roles: `BUYER`, `FARMER`, `BUSINESS`, `JOB_SEEKER`, `SERVICE_PROVIDER`, `EQUIPMENT_OWNER`, `EXPERT`, `ADMIN`.
- **`profiles`**: Extends Supabase `auth.users`. Captures name, Nigerian phone, state, LGA, bio, and verification status.
- **`user_roles`**: Join table enabling multi-role assignments.
  - *Security*: RLS prevents client insertion or modification. Only server-side service-role or `ADMIN` can assign roles.
- **`business_profiles`**: Corporate records for agribusinesses, food processors, and aggregators (CAC RC number, TIN).
- **`verification_records`**: KYC and agricultural credential verification (NIN, BVN, CAC, Farm inspection).

### 3.2 Farms & Farmers
- **`farms`**: Geolocation, state, LGA, size (hectares/acres), and production classification (`CROPS`, `LIVESTOCK`, `MIXED`, `AQUACULTURE`).
- **`farm_products`**: Associates farms with canonical agricultural produce capabilities.

### 3.3 Catalog, Listings & Inventory
- **`categories`**: Produce classification. Protected by `chk_no_pork_category` constraint.
- **`products`**: Canonical definitions of *what produce is* (e.g. White Maize, Roma Tomatoes, Broiler Chicken). Protected by `chk_no_pork_product` constraint.
- **`listings`**: Individual seller offerings (price per unit, MOQ, location, status).
- **`inventory`**: Stock control engine.
  - `quantity_on_hand` (NUMERIC >= 0)
  - `quantity_reserved` (NUMERIC >= 0)
  - `quantity_available` computed column (`quantity_on_hand - quantity_reserved`)
  - Enforces `chk_quantity_available_non_negative`: Overselling is impossible at the database engine level.

### 3.4 Cart Domain
- **`carts`**: Persistent shopping cart per user.
- **`cart_items`**: Line items. Designed so items from multiple sellers can coexist in a single cart.

### 3.5 Orders & Multi-Seller Architecture
- **`orders`**: Master order tracking buyer, total amount, delivery details, and global state.
- **`order_items`**: Line items attributed to individual sellers via `seller_id`.
  - **Snapshot Pricing**: Preserves `product_name_snapshot` and `unit_price_snapshot` at time of purchase. Never recalculates historical totals from current listing prices.
  - **Multi-Seller Fulfillment**: Facilitates splitting an order into independent seller dispatch groups.

### 3.6 Nigerian Fiat Payments
- **`payments`**: Transaction records supporting Paystack, Flutterwave, Monnify, Bank Transfer, and Escrow in NGN fiat.
  - Prohibited payment credentials (PAN, CVV, PIN) are never stored.

### 3.7 Third-Party Logistics
- **`logistics_providers`**: Registry of vetted third-party carriers. AgroMarket owns no trucks or warehouses.
- **`deliveries`**: Consignment fulfillment linking orders, sellers, and third-party logistics partners.
- **`delivery_events`**: Chronological transit tracking history.

### 3.8 Shared Purchase (Bulk Group-Splitting)
- **`shared_purchases`**: Campaign details for splitting wholesale produce (crops or livestock like live ram/goat).
- **`shared_purchase_participants`**: Member shares, pledged amounts, payment references, and portion allocation notes.
  - Strictly no pig/pork products permitted.

### 3.9 Agricultural Jobs
- **`jobs`**: Job postings (Agronomists, Farm managers, Harvest crews, Equipment operators, Casual labor).
- **`job_applications`**: Candidate resumes and application statuses.

### 3.10 Agricultural Services
- **`services`**: Service listings (Tractor operation, Soil testing, Drone spraying, Veterinary, Land clearing).
- **`service_requests`**: Quotes, bookings, and work completion tracking.

### 3.11 Farm Equipment Rental
- **`equipment`**: Directory of heavy farm machinery (Tractors, Harvesters, Tillers, Planters, Irrigation pumps).
- **`equipment_rentals`**: Booking agreements, rental dates, daily rates, and caution deposits.

### 3.12 Market Intelligence & Commodity Prices
- **`price_observations`**: Commodity prices observed across Nigerian physical markets (Mile 12, Bodija, Dawanau).
  - Categorized by `source_type` (`OFFICIAL_MONITOR`, `ENUMERATOR`, `COMMUNITY`, `COOPERATIVE`) and `verification_status`.
- **`demand_forecasts`**: Regional crop demand volume projections with model confidence scores.

### 3.13 Smart Basket
- **`user_preferences`**: Dietary requirements, monthly grocery budgets, family size, and staple preferences.
- **`basket_recommendations`**: Explainable produce bundle recommendations with estimated savings.

### 3.14 AI Conversations
- **`ai_conversations`** & **`ai_messages`**: Unified chat history and token usage for Farmer AI, Agronomy assistance, and Smart Basket.
  - Stores safety flags and mandatory advisory disclaimer acknowledgments.

### 3.15 Knowledge & Extension
- **`knowledge_content`**: Good Agronomic Practices (GAP) guides, agro-ecological advice, and official notices.

### 3.16 Reviews & Ratings
- **`reviews`**: Relational rating targets (listing, seller, service, equipment, logistics) with verified-transaction checks.

### 3.17 Disputes
- **`disputes`**: Conflict resolution mechanism for orders, deliveries, services, and rentals. Supports escrow freeze and admin mediation.

### 3.18 Notifications
- **`notifications`**: Multi-channel alerts (In-App, SMS, WhatsApp, Email, Push).

### 3.19 Admin & Security Audit Trail
- **`audit_logs`**: Immutable, append-only security log recording actors, actions, target resources, and JSON diffs. No updates or deletions allowed.

---

## 4. Row Level Security (RLS) Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Public | Own user | Own user | Admin / Cascade |
| `roles` | Public | Service / Admin | Service / Admin | Prohibited |
| `user_roles` | Own user / Admin | Service / Admin | Service / Admin | Service / Admin |
| `farms` | Public (if `is_public`) | Farmer | Farmer | Farmer |
| `listings` | Public (if `status = 'ACTIVE'`) | Seller | Seller | Seller |
| `inventory` | Public / Seller | Seller | Seller / Service | Seller |
| `carts` | Cart owner | Cart owner | Cart owner | Cart owner |
| `orders` | Buyer, Seller, Admin | Buyer | Buyer (cancel) / Seller | Admin |
| `payments` | Buyer, Admin | Buyer / Service | Service / Admin | Prohibited |
| `ai_conversations` | Conversation owner | Conversation owner | Conversation owner | Conversation owner |
| `audit_logs` | Admin only | Service role | Prohibited | Prohibited |

---

## 5. Migrations & Reproducibility

- `20260911000000_init_extensions.sql`: Initializes `uuid-ossp` and `pgcrypto`.
- `20260911010000_phase_0_2_core_schema.sql`: Complete 32-table relational schema with RLS and indexes.
- `20260911020000_phase_0_2_seed_canonical.sql`: Canonical roles, categories, and Nigerian produce reference records.
- `20260911030000_phase_0_4_marketplace_indexes.sql`: Marketplace discovery query performance indexes (`idx_listings_created_at`, `idx_listings_price`, `idx_products_category`) and listing owner RLS policies on `public.inventory`.
- `20260911040000_phase_0_5_cart_and_orders.sql`: Cart & Orders foundation:
  - Atomic PostgreSQL stored procedure `public.create_order_from_cart(p_buyer_id, p_delivery_address, p_notes)`.
  - Concurrency controls with pessimistic `FOR UPDATE` locking across cart, listings, and inventory tables.
  - Granular RLS policies for `order_items` (insert via order creation, seller viewing) and `orders` (status transitions and cancellation).
  - High-performance query indexes on `order_items(order_id)`, `order_items(seller_id)`, `orders(buyer_id)`, and `cart_items(cart_id)`.
- `20260911050000_phase_0_6_payments.sql`: Payments & Payment Verification foundation:
  - Extended check constraint on `public.payments.status` supporting `('INITIALIZED', 'INITIATED', 'PENDING', 'SUCCESSFUL', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')`.
  - Webhook journaling and idempotency table `public.payment_webhook_events` with unique constraint `(provider, event_id)`.
  - Performance and idempotency indexes on `payments(order_id, provider, status)` and `payments(created_at DESC)`.
  - Hardened RLS policies on `payments` and `payment_webhook_events`.
- `20260911060000_phase_0_7_logistics.sql`: Logistics & Delivery Coordination foundation:
  - Extended `public.logistics_providers` with `profile_id` and `updated_at`.
  - Extended `public.deliveries` status check constraint supporting `('PENDING', 'QUOTED', 'ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'DELIVERY_FAILED')`.
  - Added `delivery_fee` (NGN), `currency`, `quote_reference`, `quote_expires_at`, `external_tracking_reference`, and cancellation/failure audit columns.
  - Extended `public.delivery_events` with `actor_id` and `metadata`.
  - High-performance query indexes on `deliveries(order_id)`, `deliveries(seller_id)`, `deliveries(provider_id)`, `deliveries(status)`, `deliveries(tracking_number)`, and `delivery_events(delivery_id)`.
  - Hardened multi-stakeholder RLS policies for buyers, sellers, carriers, and admins.
- `20260912160000_phase_0_8_disputes_settlements.sql`: Disputes, Refunds & Settlements foundation:
  - Purged legacy `STELLAR_XLM` from `public.payments` check constraint, establishing pure Nigerian fiat (NGN) foundation.
  - Extended `public.disputes` with `seller_id`, `order_item_id`, `disputed_amount`, `resolution_type`, `refund_amount`, `resolution_notes`, `seller_response`, and arbitration timestamps.
  - Created `public.dispute_evidence` table with strictly isolated multi-party RLS policies.
  - Created `public.refunds` table with unique `idempotency_key` and order total integrity check.
  - Created `public.settlements` table with multi-seller partition constraint `CONSTRAINT uq_settlement_order_seller UNIQUE (order_id, seller_id)`.
  - Hardened RLS policies ensuring sellers can only view their own disputes, evidence, and settlement ledgers.
- `20260913120000_phase_0_9_market_intelligence.sql`: Market Intelligence, Regional Prices & Demand Forecasting foundation:
  - Extended `public.price_observations` with `normalized_price`, `normalized_unit`, `normalization_status`, `confidence_score`, `data_quality_label`, and `metadata`.
  - Expanded `source_type` check constraint supporting `('PLATFORM_TRANSACTION', 'FARMER_REPORTED', 'BUYER_REPORTED', 'MARKET_SURVEY', 'PARTNER_FEED', 'GOVERNMENT_SOURCE', 'COMMUNITY', 'OFFICIAL_MONITOR', 'ENUMERATOR', 'COOPERATIVE', 'OTHER')`.
  - Expanded `verification_status` check constraint supporting `('UNVERIFIED', 'SELF_REPORTED', 'VERIFIED', 'SYSTEM_DERIVED', 'REJECTED')`.
  - Extended `public.demand_forecasts` with `forecast_method`, `forecast_horizon_days`, `confidence_level`, `data_window_days`, and `data_quality_label`.
  - Composite indexes on `price_observations(product_id, state)`, `price_observations(state, observed_at DESC)`, `price_observations(source_type, verification_status)`, and `demand_forecasts(product_id, region_state, period_start DESC)`.
  - Seeded realistic simulated observations across Nigerian staples (rice, maize, beans, tomatoes) with explicit `SIMULATED` quality label and strictly zero pork.
- `20260913180000_phase_0_9_price_observations_integrity.sql`: Price Observations Integrity & Immutability:
  - Database-level check constraint `price_obs_no_simulated_verified` enforcing that `SIMULATED` records can never be marked `VERIFIED`.
  - Trigger `public.enforce_price_observation_append_only()` prohibiting updates to commodity, market, location, price, unit, source, reporter, or timestamps.
  - Trigger `public.prevent_price_observation_deletion()` preventing all `DELETE` operations on price observations.
  - Granular admin RLS policies (`SELECT`, `INSERT`, `UPDATE` for moderation only) replacing broad `FOR ALL`.
- `20260914000000_phase_1_0_smart_basket.sql`: Smart Basket Recommendation Engine:
  - Extended `public.user_preferences` with `budget_target_basket`, `preferred_categories`, `excluded_products`, `excluded_categories`, `purchasing_frequency`, `basket_purpose`, and `metadata`.
  - Extended `public.basket_recommendations` with `status`, `engine_version`, `budget_allocated`, `state`, and `metadata`.
  - Composite indexes on `basket_recommendations(user_id, created_at DESC)` and `basket_recommendations(user_id, status)`.
  - Hardened RLS policies ensuring users can view, generate, and update their own recommendations while revoking client `DELETE` authority.
- `20260915000000_phase_1_1_shared_purchase.sql`: Shared Purchase & Bulk Splitting:
  - Extended `public.shared_purchases` with `purchase_type` (`BULK_CROP`, `ANIMAL_PORTION`), `allocated_quantity`, `remaining_quantity` (stored generated column), `max_share_quantity`, `portion_model`, `portion_fractions`, `metadata`.
  - Database engine check constraint `CONSTRAINT chk_allocated_not_exceed_total CHECK (allocated_quantity <= total_quantity)`.
  - Strict database-level anti-pork constraint `CONSTRAINT chk_no_pork_shared_purchases CHECK (title !~* '\y(pork|pig|swine|bacon|ham|lard)\y' AND (description IS NULL OR description !~* '\y(pork|pig|swine|bacon|ham|lard)\y'))`.
  - Extended `public.shared_purchase_participants` with `order_id` (FK to `orders`), `unit`, `unit_price`, `portion_choice`, `metadata`, `updated_at`.
  - Extended `public.orders` with `shared_purchase_id` (FK to `shared_purchases`) for bidirectional traceability.
  - Row-locking stored procedure `public.allocate_shared_purchase_participant` (`SELECT ... FOR UPDATE`) executing atomic allocation, individual order generation, and state transition.
  - Hardened RLS policies revoking client `DELETE` authority, enforcing seller ownership on pool creation, and isolating participant pledge visibility.



