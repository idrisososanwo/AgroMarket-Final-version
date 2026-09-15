# AgroMarket Development Guide

This guide covers local development workflows, code conventions, testing practices, and Git hygiene.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or later (tested on Node `25.x`)
- **npm**: `v10.x` or later
- **Git**
- Optional: **Supabase CLI** (`npm i -g supabase`) for local database emulation

---

## 2. Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the required keys:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase instance URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase server-only service role key

> **Security Note**: Never commit `.env.local` or any secrets to Git.

---

## 3. Available Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Next.js local development server on port 3000 |
| `npm run build` | Compiles the production application bundle |
| `npm run start` | Runs the compiled production server |
| `npm run test` | Executes unit tests using Vitest |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run typecheck` | Validates TypeScript types across the entire codebase |
| `npm run lint` | Runs ESLint analysis for code quality and Next.js best practices |
| `npm run format` | Runs Prettier to enforce consistent code style |

---

## 4. Feature Development Rules

When implementing new functionality:

1. **Locate or create within the proper domain boundary in `src/features/<domain>`**.
   - Do NOT place domain-specific logic into generic `lib/` or `components/`.
   - Each domain should export its public API from its `index.ts`.
2. **Server-Side Authorization**:
   - Always protect sensitive data using `requireAuth()` or `requireRole(role)` from `@/lib/auth/server`.
   - Never trust client-side role assertions.
3. **Product Restrictions**:
   - Always verify that produce categories and items do not violate the **Prohibited Items Policy** (no pig/pork products).
4. **Validation**:
   - Use Zod schemas in `src/lib/validation` for input sanitation.
   - For phone numbers in Nigeria, use `nigerianPhoneSchema` and `normalizeNigerianPhone()`.

---

## 5. Testing Standards

- Every new utility, authorization guard, or critical business rule must be accompanied by unit tests (`*.test.ts`).
- Tests are executed using `vitest`.
- All tests must pass before committing or merging into main.

---

## 6. Database & Migration Workflows

- Migrations are managed inside `supabase/migrations/`.
- To create a new migration:
  ```bash
  npx supabase migration new <migration_name>
  ```
- To apply migrations locally:
  ```bash
  npx supabase db reset
  ```
- Detailed entity schemas, constraints, and RLS policies are documented in [docs/database.md](database.md).

---

## 7. Authentication & Role Enforcement Workflows

- **Authentication Endpoints**:
  - Sign in: `/auth/login`
  - Sign up: `/auth/register`
  - Password Reset: `/auth/forgot-password` and `/auth/reset-password`
  - Email Verification: `/auth/verify`
- **Onboarding Flow**:
  - Initial profile completion & role selection: `/onboarding`
- **Role-Protected Workspaces**:
  - Account & Profile: `/account`
  - Farmers: `/farmer` (requires `FARMER`)
  - Businesses: `/business` (requires `BUSINESS`)
  - Job Placements: `/jobs` (requires `JOB_SEEKER` or `ADMIN`)
  - Services: `/services` (requires `SERVICE_PROVIDER`)
  - Equipment: `/equipment` (requires `EQUIPMENT_OWNER`)
  - Admin: `/admin` (requires `ADMIN`)
- **Testing Role Authorization**:
  ```bash
  npm run test src/test/auth-rbac.test.ts
  ```

---

## 8. Marketplace Catalog & Inventory Workflows (Phase 0.4)

- **Public Marketplace Discovery**:
  - Live produce catalog: `/marketplace`
  - Produce detail view: `/marketplace/[listingId]`
  - Supports server-side search, categories, Nigerian states, price range, and sorting.
- **Seller Management (Requires `FARMER` or `BUSINESS`)**:
  - Listings & inventory dashboard: `/farmer/listings`
  - Create new listing: `/farmer/listings/new`
  - Edit listing & adjust stock: `/farmer/listings/[listingId]/edit`
- **Testing Marketplace & Inventory Logic**:
  ```bash
  npm run test src/test/marketplace.test.ts
  ```

---

## 9. Cart & Order Workflows (Phase 0.5)

- **Buyer Cart & Checkout Routes**:
  - Live shopping cart: `/cart`
  - Order history: `/account/orders`
  - Order receipt & tracking: `/account/orders/[orderId]`
  - Supports multi-seller grouping, real-time stock limits, server-calculated totals, and delivery details.
- **Seller Order Management (Requires `FARMER` or `BUSINESS`)**:
  - Incoming orders dashboard: `/farmer/orders`
  - Scoped strictly to the seller's line items and buyer delivery information.
  - Supports controlled state machine transitions (`PAID` ➔ `PROCESSING` ➔ `COMPLETED`).
- **Testing Cart & Orders Logic**:
  ```bash
  npm run test src/test/cart-orders.test.ts
  ```

---

## 10. Payment Workflows & Webhooks (Phase 0.6)

- **Buyer Checkout & Payment Routes**:
  - Payment gateway selection & checkout: `/account/orders/[orderId]/pay`
  - Gateway callback return & cryptographic verification: `/account/orders/[orderId]/payment/callback`
  - Webhook endpoints:
    - Paystack: `/api/webhooks/paystack` (Signed with `x-paystack-signature` HMAC-SHA512)
    - Flutterwave: `/api/webhooks/flutterwave` (Signed with `verif-hash`)
- **Testing Payments & Cryptography**:
  ```bash
  npm run test src/test/payments.test.ts
  ```
- **Local Webhook Emulation**:
  To simulate a Paystack webhook locally:
  ```bash
  curl -X POST http://localhost:3000/api/webhooks/paystack \
    -H "Content-Type: application/json" \
    -H "x-paystack-signature: <hmac-sha512-hex-digest>" \
    -d '{"event":"charge.success","data":{"id":123,"reference":"AGRO-...","amount":500000,"currency":"NGN","status":"success"}}'
  ```

---

## 11. Logistics & Delivery Coordination Workflows (Phase 0.7)

- **Buyer & Seller Delivery Tracking**:
  - Multi-consignment transit tracker: `/account/orders/[orderId]/delivery`
  - Visual stage progress indicator and immutable event ledger.
- **Carrier & Admin Dispatch Portal**:
  - Carrier deliveries dashboard: `/logistics/deliveries`
  - Consignment dispatch control & status updater: `/logistics/deliveries/[deliveryId]`
- **Testing Logistics & State Machine**:
  ```bash
  npm run test src/test/logistics.test.ts
  ```

---

## 12. Disputes & Settlement Accounting Workflows (Phase 0.8)

- **Buyer Dispute Routes**:
  - File a dispute: `/account/orders/[orderId]/dispute/new`
  - Track dispute progress: `/account/disputes` and `/account/disputes/[disputeId]`
- **Farmer Dispute & Settlement Dashboards**:
  - Incoming claims: `/farmer/disputes` and `/farmer/disputes/[disputeId]`
  - Payout statements & escrow holds: `/farmer/settlements`
- **Admin Arbitration & Payout Dispatch**:
  - Dispute arbitration console: `/admin/disputes` and `/admin/disputes/[disputeId]`
  - Settlement ledger: `/admin/settlements`
- **Testing Disputes & Settlements**:
  ```bash
  npm run test src/test/disputes-settlements.test.ts
  ```

---

## 13. Market Intelligence & Demand Forecasting Workflows (Phase 0.9)

- **Buyer & Public Intelligence Route**:
  - Transparent price trends, regional comparisons, and observation audits: `/market`
- **Farmer Intelligence Route**:
  - Produce wholesale price movement, 7-day baseline demand forecast, and price reporting: `/farmer/market-intelligence`
- **Admin Market Moderation**:
  - Inspect, verify, or reject price observations and recalculate demand forecasts: `/admin/market-intelligence`
- **Testing Market Intelligence & Forecasting**:
  ```bash
  npm run test src/test/prices-demand.test.ts
  ```

---

## 14. Smart Basket Workflows (Phase 1.0)

- **Smart Basket Recommendation Engine**:
  - Personalized food basket generator with budget slider and regional proximity scoring: `/smart-basket`
- **Testing Smart Basket**:
  ```bash
  npm run test src/test/smart-basket.test.ts
  ```

---

## 15. Shared Purchase Workflows (Phase 1.1)

- **Buyer Public Catalog & Details**:
  - Open pool directory with search, filter (bulk crops vs livestock portions), and progress bars: `/shared-purchases`
  - Pool details, price breakdown, participants list, and join/pledge modal: `/shared-purchases/[id]`
- **Buyer Account Participations**:
  - Manage pledges, initialize Paystack/Flutterwave payments, view order links: `/account/shared-purchases`
- **Farmer Seller Pool Management**:
  - Seller active pools dashboard: `/farmer/shared-purchases`
  - Launch new shared pool with upfront stock reservation: `/farmer/shared-purchases/new`
  - Seller pool control panel (advance lifecycle to fulfillment, view participants, or cancel): `/farmer/shared-purchases/[id]`
- **Testing Shared Purchases**:
  ```bash
  npm run test src/test/shared-purchase.test.ts
  ```




