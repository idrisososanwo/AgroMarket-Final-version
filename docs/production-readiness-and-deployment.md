# AgroMarket Production Readiness, Security Hardening & Deployment Verification (Phase 3.19)

## 1. Executive Summary

Phase 3.19 establishes production-grade operational safeguards, security hardening, and deployment readiness verification across the AgroMarket platform. Building incrementally upon the foundational services of Phase 3.17 (background jobs) and Phase 3.18 (observability and reliability), this phase implements strict defense-in-depth measures:

- Centralized, leak-proof environment configuration inspection and validation.
- Server-authoritative authentication, RBAC, and cross-user resource ownership checks.
- Cryptographically verified, size-bounded, idempotent Paystack and Flutterwave webhook processing.
- Native deployment scheduler configuration (`vercel.json`) fail-closed against unauthorized invocations.
- Strict HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`, `X-DNS-Prefetch-Control`) and `Cache-Control: no-store` on sensitive endpoints.
- Honest, evidence-grounded production readiness reporting distinguishing `VERIFIED`, `CONFIGURED`, `UNAVAILABLE`, `UNKNOWN`, and `DEGRADED` capabilities.
- 48 chronologically ordered database migrations with documented application and backup recovery expectations.

---

## 2. Environment Variables & Configuration Matrix

### A. Variable Specifications by Purpose

| Variable Name | Required / Optional | Scope | Description & Safety Guidance |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Public / Client & Server | Supabase project REST URL (`https://<project-id>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | Public / Client & Server | Publishable client key. Access governed by database Row-Level Security (RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required in Prod** | Private / Server Only | High-privilege administrative database key. **Never** bundle into client code or expose to browsers. |
| `NEXT_PUBLIC_APP_URL` | **Required** | Public / Client & Server | Canonical public URL (e.g., `https://agromarket.ng`). Used for OAuth redirects and payment callbacks. |
| `NODE_ENV` | **Required** | Environment | `development`, `test`, or `production`. Enables strict validation, HSTS, and error redaction in production. |
| `CRON_SECRET` | **Required for Scheduler** | Private / Server Only | Secret token authenticating `/api/cron/process-jobs`. Evaluated in timing-safe comparisons. |
| `SCHEDULER_SECRET` | Optional | Private / Server Only | Secondary secret alias for external schedulers or manual operational triggers. |
| `PAYSTACK_SECRET_KEY` | Optional / Required for Checkout | Private / Server Only | Server secret key for Paystack API transactions and HMAC-SHA512 webhook validation. |
| `PAYSTACK_PUBLIC_KEY` | Optional | Public / Client | Publishable key for Paystack inline checkout widgets. |
| `PAYSTACK_WEBHOOK_SECRET` | Optional | Private / Server Only | Dedicated webhook secret if configured separately in Paystack Dashboard. |
| `FLUTTERWAVE_SECRET_KEY` | Optional / Required for Checkout | Private / Server Only | Secret key for Flutterwave v3 API calls. |
| `FLUTTERWAVE_PUBLIC_KEY` | Optional | Public / Client | Publishable key for Flutterwave checkout widgets. |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Optional | Private / Server Only | Secret verification hash expected in the `verif-hash` HTTP header. |
| `GEMINI_API_KEY` | Optional | Private / Server Only | Google Gemini API key for AI agronomic reasoning. Platform falls back to deterministic models if unset. |

### B. Safe Local Development vs. Production Deployment Practices

1. **Local Development**:
   - Copy `.env.example` to `.env.local`.
   - Never commit `.env.local`, `.env`, or `.env.production` to Git. (Enforced in `.gitignore`).
   - Mock/test keys (e.g. `sk_test_...`) may be used in `.env.local` for sandbox testing.

2. **Production Hosting (e.g., Vercel, Railway, Supabase)**:
   - Configure variables exclusively through your hosting provider's encrypted Environment Variables management dashboard.
   - Separate Staging and Production environments with distinct Supabase projects and API keys.
   - Rotate any credential immediately if accidentally logged or shared.

3. **Leak-Proof Safe Inspection**:
   - Centralized validation in `src/config/env.ts` (`inspectEnvironmentReadiness()`) verifies presence and formats of variables.
   - Field names and booleans are reported; actual secret values, tokens, and database passwords are **never** echoed in logs, health probes, or error messages.

---

## 3. Authentication, Authorization & Security Boundaries

### A. Server-Side Authorization Enforcements

AgroMarket enforces authorization exclusively on the server, independent of client-side navigation or UI visibility:

1. **Role-Based Access Control (RBAC)**:
   - Governed by `requireRole("ADMIN" | "FARMER" | "BUYER" | "AGENT" | "TRANSPORTER")` in `src/lib/auth/server.ts`.
   - Administrative dashboards (`/admin/*`) and administrative server actions (e.g., `getOperationalDashboardAction`, `getProductionReadinessReportAction`, governance overrides) fail closed with `403 Forbidden` for non-admin accounts.

2. **Resource Ownership & Cross-User Isolation**:
   - **Payment Verification**: `PaymentService.verifyAndProcessPayment(reference, provider, expectedBuyerId)` validates that the caller owns the underlying payment record (`payment.buyer_id === expectedBuyerId`). Unauthorized callers receive an access denial exception.
   - **Payment Initialization**: `PaymentService.initializeOrderPayment` verifies that the authenticating user matches the order buyer (`order.buyer_id === buyerId`).
   - **Order and Cart Access**: Server actions retrieve user identity via `requireAuth()` and scope database queries to the authenticated user ID.

3. **Service-Role Isolation**:
   - Client-side code and ordinary user requests instantiate `createClient()` (scoped to user session and RLS policies).
   - High-privilege `createAdminClient()` (using `SUPABASE_SERVICE_ROLE_KEY`) is isolated to background job processors, webhook receivers, and administrative actions behind strict auth guards.

---

## 4. Payment Gateway & Webhook Reliability

AgroMarket supports two authoritative payment gateways: **Paystack** and **Flutterwave**. Both adhere to the following security standards:

### A. Cryptographic Signature & Body Verification
- **Paystack Webhook** (`/api/webhooks/paystack`):
  - Requires `x-paystack-signature` HTTP header.
  - Verifies HMAC-SHA512 computed against the raw request body using `crypto.timingSafeEqual` to prevent timing attacks.
- **Flutterwave Webhook** (`/api/webhooks/flutterwave`):
  - Requires `verif-hash` HTTP header.
  - Performs timing-safe comparison against the configured `FLUTTERWAVE_WEBHOOK_SECRET`.
- **Payload Size Bounding**: Both endpoints reject request bodies exceeding 1MB (`1024 * 1024` bytes) with HTTP 400.

### B. Idempotency & Duplicate Handling
- Every incoming webhook event is journaled into `public.payment_webhook_events`.
- If an event is retransmitted by the provider, PostgreSQL detects the unique constraint on `(provider, event_id)` (error code `23505`).
- The handler immediately acknowledges duplicate delivery with HTTP 200 `"Event already processed"`, preventing duplicate database mutations or double order fulfillment.

### C. Client Manipulation Defenses
- The frontend returning to a callback URL (e.g. `/account/orders/[id]/payment/callback`) **never** marks an order as paid.
- Payment status transitions (`PENDING -> PAID`) occur exclusively upon receipt of verified server-to-server webhook confirmation or authoritative provider verification queries (`PaymentService.verifyAndProcessPayment`).

---

## 5. Background Scheduler & Worker Deployment

### A. Scheduler Configuration
- **Target**: Vercel Native Scheduled Jobs (Crons).
- **Configuration** (`vercel.json`):
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "crons": [
      {
        "path": "/api/cron/process-jobs",
        "schedule": "*/5 * * * *"
      }
    ]
  }
  ```
- **Execution Endpoint**: `/api/cron/process-jobs` (accepts POST and GET for Vercel Cron invocation).

### B. Cron Authentication & Fail-Closed Safeguards
- Evaluates `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- Fails closed with HTTP 401 `UNAUTHORIZED` if:
  1. `CRON_SECRET` is unset in the server environment.
  2. The request lacks the authorization header.
  3. The secret provided does not match `CRON_SECRET` or `SCHEDULER_SECRET`.
- Public users and automated scanners cannot trigger worker cycles or administrative job retries.

### C. Worker Activity Verification
- Operators can verify background worker activity using `ObservabilityService.getOperationalDashboardData()` or the administrative operations console:
  - `lastAttemptedRunAt` and `lastSuccessfulRunAt` record live timestamps of worker cycles.
  - `lease_expires_at` ensures distributed workers do not execute duplicate jobs simultaneously.
  - Expired leases are automatically reclaimed; repeatedly failing jobs are transitioned to `DEAD_LETTER` after exponential backoff.

---

## 6. Database Migrations, Schema Readiness & Disaster Recovery

### A. Migration Ordering & Conventions
- Migrations reside in `supabase/migrations/` and follow the chronological naming standard:
  `YYYYMMDDHHMMSS_<descriptive_name>.sql`.
- 48 sequential migrations are present in the repository, spanning from initial extensions (`20260911000000_init_extensions.sql`) to background processing (`20261009120000_phase_3_17_background_processing.sql`).
- All migrations contain idempotent statements (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ ... $$`).

### B. Deployment & Migration Workflow
1. **Local Development**:
   ```bash
   supabase db reset
   # or apply specific migration
   supabase migration up
   ```
2. **Production Deployment**:
   ```bash
   # Link repository to production Supabase project
   supabase link --project-ref <production-project-id>
   # Push new migrations safely
   supabase db push
   ```

### C. Backup & Point-in-Time Recovery (PITR)
- **Database Provider**: Managed Supabase PostgreSQL.
- **Automated Daily Backups**: Managed by Supabase infrastructure for Pro/Enterprise tiers.
- **Point-in-Time Recovery (PITR)**: Enables rolling back database state to any specific second within the retention window (typically 7 to 30 days).
- **Recovery Limitations**: Remote PITR and WAL archiving occur at the Supabase infrastructure layer and cannot be verified directly via application-level runtime queries. The application readiness report marks Disaster Recovery status as `UNKNOWN` and recommends manual verification in the Supabase Management Console.

---

## 7. Production Security Defaults & HTTP Headers

Next.js Middleware (`src/middleware.ts`) automatically injects defensive headers across all matched application routes:

| Header | Production Value | Purpose |
| :--- | :--- | :--- |
| `X-Frame-Options` | `DENY` | Prevents clickjacking by blocking iframe embedding. |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME-type sniffing attacks. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leaked across origins. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Restricts browser device hardware access. |
| `X-DNS-Prefetch-Control` | `on` | Optimizes DNS prefetching without compromising privacy. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS in production mode. |

### Cache Control for Sensitive Endpoints
Endpoints handling authentication, payment processing, background jobs, or operational telemetry enforce:
`Cache-Control: no-store, max-age=0, must-revalidate`
`Pragma: no-cache`

Covered routes include:
- `/api/cron/*`
- `/api/webhooks/*`
- `/admin/*`
- `/account/*`
- `/api/health/*`

---

## 8. Operational Readiness Evidence Assessment

The readiness assessment engine (`ObservabilityService.getProductionReadinessReport()`) evaluates all platform capabilities using transparent status classifications:

### Evidence State Classifications
- `VERIFIED`: Proven operational via real runtime execution, database queries, or automated test gates.
- `CONFIGURED`: Required credentials/configuration exist in the environment, but third-party carrier transmission has not been demonstrated.
- `UNAVAILABLE`: Subsystem is intentionally unconfigured, disabled, or missing required credentials.
- `UNKNOWN`: Remote cloud or third-party infrastructure status that cannot be inspected from the application process.
- `DEGRADED`: Subsystem is responding but operating with active errors, backlog, or elevated latency.

### Current Capability Status Matrix

| Capability | Category | Current Status | Evidence & Operator Context |
| :--- | :--- | :--- | :--- |
| **Core Database (PostgreSQL / Supabase)** | INFRASTRUCTURE | `VERIFIED` | Active connection verified via read probe on `background_jobs`. |
| **Database Migrations & Schema Integrity** | INFRASTRUCTURE | `VERIFIED` | 48 version-controlled migrations present in sequence. |
| **Authentication & Multi-Role RBAC** | AUTH_RBAC | `VERIFIED` | 5 user roles (`BUYER`, `FARMER`, `AGENT`, `TRANSPORTER`, `ADMIN`) enforced via server guards. |
| **Domain Compliance: Anti-Pork Invariant** | SECURITY | `VERIFIED` | Zero-tolerance porcine produce filtering enforced across listings, AI, and logs. |
| **Background Processing Queue** | PROCESSING | `VERIFIED` | Queue table accessible; atomic leases and dead-letter classification operational. |
| **Scheduled Jobs (Cron)** | PROCESSING | `CONFIGURED` / `VERIFIED` | `vercel.json` and `CRON_SECRET` configured. Verified upon observing active execution cycles. |
| **Paystack Payment Gateway** | INTEGRATIONS | `CONFIGURED` / `UNAVAILABLE` | Configured if `PAYSTACK_SECRET_KEY` present. HMAC-SHA512 verification and ownership guards active. |
| **Flutterwave Payment Gateway** | INTEGRATIONS | `CONFIGURED` / `UNAVAILABLE` | Configured if `FLUTTERWAVE_SECRET_KEY` present. Secret hash verification and ownership guards active. |
| **In-App Notification Dispatch** | PROCESSING | `VERIFIED` | Internal notifications table and real-time state changes fully functional. |
| **External Telecom Gateways (SMS, WhatsApp, Push)** | INTEGRATIONS | `UNAVAILABLE` | Third-party carrier SDKs (Termii, Twilio) are not configured. System strictly avoids fake delivery claims. |
| **AI Agricultural Intelligence (Gemini 2.0)** | INTEGRATIONS | `CONFIGURED` / `UNAVAILABLE` | Configured if `GEMINI_API_KEY` present; deterministic fallback engine active when unset. |
| **Security Headers & Middleware Hardening** | SECURITY | `VERIFIED` | Next.js middleware injects defensive headers and no-store cache controls. |
| **Disaster Recovery & Point-in-Time Recovery** | DISASTER_RECOVERY | `UNKNOWN` | Managed at Supabase cloud infrastructure level; requires verification in Supabase dashboard. |

---

## 9. Operator Checklist Before Live Deployment

Before switching DNS to point live traffic to AgroMarket, an operator must perform the following steps:

1. [ ] **Set Production Environment Variables** in Vercel / hosting dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `CRON_SECRET`
   - `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET`
   - `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`
   - `GEMINI_API_KEY`
2. [ ] **Configure Webhook URLs** in Payment Dashboards:
   - Paystack Dashboard -> Settings -> Preferences -> Webhook URL: `https://your-domain.ng/api/webhooks/paystack`
   - Flutterwave Dashboard -> Settings -> Webhooks -> Webhook URL: `https://your-domain.ng/api/webhooks/flutterwave`
   - Copy the secret hash from Flutterwave and set as `FLUTTERWAVE_WEBHOOK_SECRET`.
3. [ ] **Verify Vercel Cron Trigger**:
   - Verify `vercel.json` crons are registered under Vercel Project -> Settings -> Cron Jobs.
   - Confirm that Vercel includes the `Authorization: Bearer <CRON_SECRET>` header in invocations.
4. [ ] **Verify Supabase Database Backups**:
   - Confirm in the Supabase Dashboard that automated backups and PITR are enabled.
5. [ ] **Query the Readiness Endpoint**:
   - Visit `https://your-domain.ng/api/health/readiness` or invoke `getProductionReadinessReportAction` as an admin to verify all capabilities report expected production states.
