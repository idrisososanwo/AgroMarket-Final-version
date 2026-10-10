# AgroMarket — Production Deployment Activation Checklist & Verification Report

**Target Commit**: `ee0ee94` (Branch: `main`, up to date with `origin/main`)  
**Deployment Platform**: Vercel (Next.js 15 Serverless) + Supabase (PostgreSQL 17.6)  
**Database Project**: `AgroMarket 2` (`pjmsfjngwetvuwbgttiv` in `eu-west-3`)  
**Audit & Verification Date**: October 10, 2026  

---

## 1. Executive Summary & Verification Matrix

| Area / Check | Status | Direct Evidence / Verification Source | Next Action Required |
| :--- | :--- | :--- | :--- |
| **Git Deployment Commit** | **VERIFIED** | Commit `ee0ee94` is HEAD of `main`, identical to `origin/main`. Working tree clean. | None. Safe to deploy. |
| **Code Quality & Build Gates** | **VERIFIED** | 73 test files passed (1,314 tests), 0 type errors, 0 lint warnings, Next.js build clean. | None. |
| **Supabase Remote Migrations** | **VERIFIED** | Direct CLI inspection (`supabase migration list`) confirms **all 48 migrations applied to remote**; 0 pending. | None. Migrations up to date. |
| **Core Database Tables** | **VERIFIED** | Direct SQL query confirms `background_jobs`, `payment_webhook_events`, `orders`, `listings`, and `notifications` exist in `pjmsfjngwetvuwbgttiv`. | None. |
| **Background Worker RPC** | **VERIFIED** | Direct SQL query confirms `claim_background_jobs` (`FOR UPDATE SKIP LOCKED`) is installed in `public` schema. | None. |
| **Row Level Security (RLS)** | **VERIFIED** | Direct SQL query confirms `relrowsecurity = true` on `background_jobs`, `payment_webhook_events`, `orders`, and `listings`. | None. |
| **Database Backups / PITR** | **UNKNOWN** | Remote WAL / Point-in-Time Recovery settings cannot be queried via SQL. | **PENDING MY ACTION**: Check Supabase Dashboard $\to$ Database $\to$ Backups. |
| **Vercel Project Setup** | **PENDING MY ACTION** | Vercel CLI is not authenticated locally. Project must be imported in Vercel web UI. | **PENDING MY ACTION**: Import GitHub repo into Vercel and enter environment variables. |
| **Paystack Webhook Setup** | **PENDING MY ACTION** | `/api/webhooks/paystack` implemented; HMAC-SHA512 verified in code. Awaiting webhook registration in Paystack. | **PENDING MY ACTION**: Register URL in Paystack Dashboard (Test Mode). |
| **Flutterwave Webhook Setup** | **PENDING MY ACTION** | `/api/webhooks/flutterwave` implemented; `verif-hash` verified in code. Awaiting webhook registration in Flutterwave. | **PENDING MY ACTION**: Register URL in Flutterwave Dashboard (Test Mode). |
| **Live Sandbox Purchase** | **PENDING MY ACTION** | Requires deployed URL to receive real Paystack/Flutterwave webhook callback. | **PENDING MY ACTION**: Execute 1 test purchase following the walkthrough below. |

---

## 2. Environment Variables Specification

Configure these in **Vercel Project Settings $\to$ Environment Variables**.

| Variable Name | Exact Purpose in Code | Scope | Where to Obtain | Sandbox / Test Value | Security Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Connects browser and server to Supabase REST & Auth API (`src/lib/supabase/client.ts`). | Core App (Required) | Supabase Dashboard $\to$ Settings $\to$ API $\to$ Project URL (Format: `https://pjmsfjngwetvuwbgttiv.supabase.co`) | `https://pjmsfjngwetvuwbgttiv.supabase.co` | Public (Safe in browser). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key for user authentication and RLS-protected queries (`src/lib/supabase/client.ts`). | Core App (Required) | Supabase Dashboard $\to$ Settings $\to$ API $\to$ `anon` / `public` key | Your project anon key | Public (Safe in browser with RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key allowing background workers to claim jobs and update records (`src/lib/supabase/admin.ts`). | Background Worker & Admin (Required) | Supabase Dashboard $\to$ Settings $\to$ API $\to$ `service_role` key | Your project service role key | **CRITICAL SECRET**: NEVER prefix with `NEXT_PUBLIC_`. Keep on Vercel server only. |
| `NEXT_PUBLIC_APP_URL` | Canonical origin for redirects and payment callback links (`src/features/payments/service.ts`). | Core App (Required) | Your assigned Vercel URL (e.g. `https://agromarket.vercel.app`) | Your Vercel deployment URL | Public. |
| `CRON_SECRET` | Secret token authenticating scheduled Vercel Cron requests to `/api/cron/process-jobs` (`src/features/background-jobs/scheduler.ts`). | Background Worker (Required) | Generate yourself: any random 32+ character alphanumeric string | Random string | **CRITICAL SECRET**: Keeps automated worker triggers private. |
| `PAYSTACK_SECRET_KEY` | Server-to-server secret for initializing/verifying transactions and signing webhooks (`src/features/payments/providers/paystack.ts`). | Payments (Required for Paystack) | Paystack Dashboard (Test Mode) $\to$ Settings $\to$ API Keys & Webhooks | Starts with `sk_test_` | **CRITICAL SECRET**: Use `sk_test_` until launch day. |
| `PAYSTACK_PUBLIC_KEY` | Public key loading the Paystack checkout popup in client browser (`src/features/payments/`). | Payments (Required for Paystack) | Paystack Dashboard (Test Mode) $\to$ Settings $\to$ API Keys & Webhooks | Starts with `pk_test_` | Public. |
| `PAYSTACK_WEBHOOK_SECRET` | *Optional*: Custom webhook secret token. | Payments (Optional) | Paystack Dashboard $\to$ Webhook Secret | Can leave blank or match `PAYSTACK_SECRET_KEY` | **Code Verification**: Code falls back automatically to `PAYSTACK_SECRET_KEY` if this is unset. |
| `FLUTTERWAVE_SECRET_KEY` | Server-to-server secret for Flutterwave transaction calls (`src/features/payments/providers/flutterwave.ts`). | Payments (Required for Flutterwave) | Flutterwave Dashboard (Test Mode) $\to$ Settings $\to$ API | Starts with `FLWSECK_TEST-` | **CRITICAL SECRET**: Use `FLWSECK_TEST-` until launch day. |
| `FLUTTERWAVE_PUBLIC_KEY` | Public key loading Flutterwave modal in client browser (`src/features/payments/`). | Payments (Required for Flutterwave) | Flutterwave Dashboard (Test Mode) $\to$ Settings $\to$ API | Starts with `FLWPUBK_TEST-` | Public. |
| `FLUTTERWAVE_WEBHOOK_SECRET` | **Mandatory for Flutterwave**: The secret hash (`verif-hash`) sent in webhook headers. | Payments (Required for Flutterwave) | Flutterwave Dashboard $\to$ Settings $\to$ Webhooks $\to$ Secret hash | Custom secret passphrase created by operator | **CRITICAL SECRET**: Must match the secret hash entered in Flutterwave webhook dashboard. |
| `GEMINI_API_KEY` | Google Gemini 2.0 API key for agronomic RAG assistant and crop advice (`src/features/agricultural-rag/`). | AI Advisory (Optional) | [Google AI Studio](https://aistudio.google.com/) $\to$ Get API Key | Any valid Gemini key or leave unset | Secret key. Safe algorithmic fallbacks activate if unset. |

---

## 3. Webhook Architecture & Signature Mechanics

### Paystack Webhook (`/api/webhooks/paystack`)
- **Route**: `POST /api/webhooks/paystack`
- **Signature Header**: `x-paystack-signature`
- **Mechanism**: Timing-safe HMAC-SHA512 hash computed over the raw request body.
- **Key Used**: `PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET_KEY`
- **Payload Limit**: Strictly bounded to 1MB.
- **Idempotency**: Unique constraint code `23505` on `payment_webhook_events(provider, event_id)` logs and ignores duplicate deliveries with HTTP 200 `"Event already processed"`.

### Flutterwave Webhook (`/api/webhooks/flutterwave`)
- **Route**: `POST /api/webhooks/flutterwave`
- **Signature Header**: `verif-hash`
- **Mechanism**: Timing-safe constant-time string comparison (`crypto.timingSafeEqual`) between the header value and `FLUTTERWAVE_WEBHOOK_SECRET`.
- **Key Used**: `FLUTTERWAVE_WEBHOOK_SECRET` (**required**).
- **Payload Limit**: Strictly bounded to 1MB.
- **Idempotency**: Unique constraint on `payment_webhook_events(provider, event_id)` prevents duplicate balance credits.

---

## 4. Manual Dashboard Steps for the Operator

### Stage A: Deploy Project on Vercel
1. Log in to [Vercel](https://vercel.com) $\to$ Click **Add New...** $\to$ **Project**.
2. Select GitHub repository: `idrisososanwo/AgroMarket-Final-version`.
3. Set **Framework Preset**: `Next.js` | **Root Directory**: `./`.
4. Under **Environment Variables**, paste the keys from Section 2 above.
   *(Tip: Use your project URL `https://pjmsfjngwetvuwbgttiv.supabase.co` and retrieve your `anon` and `service_role` keys from the Supabase API settings page).*
5. Click **Deploy**.
6. When deployment finishes, copy your live assigned URL (e.g., `https://agromarket-final-version.vercel.app`).
7. Go to **Project Settings** $\to$ **Environment Variables** $\to$ update `NEXT_PUBLIC_APP_URL` to your assigned live URL.

### Stage B: Register Paystack Test Webhook
1. Open [Paystack Dashboard](https://dashboard.paystack.com) $\to$ Confirm toggle reads **Test Mode**.
2. Click **Settings** (gear icon) $\to$ **API Keys & Webhooks**.
3. Under **Test Webhook URL**, enter:
   `https://<your-vercel-domain>/api/webhooks/paystack`
4. Click **Save Changes**.

### Stage C: Register Flutterwave Test Webhook
1. Open [Flutterwave Dashboard](https://app.flutterwave.com) $\to$ Confirm toggle reads **Test Mode**.
2. Click **Settings** $\to$ **Webhooks**.
3. Under **URL**, enter:
   `https://<your-vercel-domain>/api/webhooks/flutterwave`
4. Under **Secret hash**, enter the exact password you configured for `FLUTTERWAVE_WEBHOOK_SECRET` in Vercel.
5. Click **Save**.

### Stage D: Check Supabase Backups
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/pjmsfjngwetvuwbgttiv).
2. Click **Database** $\to$ **Backups**.
3. Confirm daily snapshots or Point-in-Time Recovery (PITR) are enabled.

---

## 5. End-to-End Sandbox Purchase Verification Walkthrough

Once deployed, complete this exact sequence:

1. **Farmer Listing Creation**:
   - Register a test farmer account at `https://<your-domain>/auth/register`.
   - Go to `/farmer/listings/new` $\to$ Create a product: **"Organic Tomatoes"**, ₦5,000, 10 kg.
   *(Invariant Note: Never use pork, pig, swine, or bacon keywords; the system strictly blocks them).*
2. **Buyer Checkout**:
   - In an Incognito window, register a test buyer at `/auth/register`.
   - Go to `/marketplace` $\to$ Add Tomatoes to cart $\to$ Proceed to Checkout.
   - Enter delivery address $\to$ Click Place Order (order status will be `PENDING`).
3. **Paystack Sandbox Payment**:
   - Select Paystack $\to$ Click Pay with Paystack.
   - Use official Paystack test card:
     - **Card Number**: `4084 0840 0840 0840`
     - **Expiry Date**: `12/30` | **CVV**: `408` | **PIN**: `1111` | **OTP**: `123456`
   - Complete payment $\to$ Green checkmark displayed.
4. **Automatic System Effects to Verify**:
   - **Order Status**: Buyer order status transitions from `PENDING` $\to$ `PAID`.
   - **Webhook Journal**: Supabase table `payment_webhook_events` has a new row with `provider = 'PAYSTACK'`, `event_type = 'charge.success'`, and `status = 'PROCESSED'`.
   - **Health Endpoint**: `https://<your-domain>/api/health/ready` returns `"status": "HEALTHY"`.
   - **Operational Report**: `/admin/operations` promotes Paystack status from `CONFIGURED` to `VERIFIED`.
   - **Background Worker**: `vercel.json` cron calls `/api/cron/process-jobs` every 5 minutes, executing maintenance tasks without errors.
