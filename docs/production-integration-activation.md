# AgroMarket Phase 3.21: Production Integration & Operational Activation Guide

## 1. Executive Summary & Objective

AgroMarket Phase 3.21 audits and activates platform integrations for production deployment. This guide and operational checklist directly discriminates between:
1. **Implemented in Code**: Capabilities designed, structured, and guarded by domain invariants in the repository.
2. **Configured in Deployment Files**: Credentials, endpoints, or schedules specified in environment variables (`.env.example`, Vercel config).
3. **Connected to Intended Service**: Handshake confirmed via live network protocol or client probe.
4. **Exercised in Safe Test / Sandbox**: Validated via automated deterministic contract tests or provider-approved test transactions.
5. **Verified Operating in Production**: Backed by genuine runtime operational journals or telemetry.

---

## 2. Queue & Background Worker Architecture

### 2.1. Authoritative Queue Backend
- **Primary / Production Engine**: Supabase / PostgreSQL table `public.background_jobs`.
- **Atomic Locking Mechanism**: PostgreSQL RPC `public.claim_background_jobs(p_worker_id, p_batch_size, p_lease_duration_seconds, p_allowed_types)` utilizing **`FOR UPDATE SKIP LOCKED`**.
- **Absence of Redis / BullMQ**: The production architecture deliberately does not rely on an external Redis cluster or BullMQ daemon. Background processing runs serverless on Next.js / Supabase to minimize infrastructure sprawl while retaining transactional ACID guarantees.
- **Resilient Fallback**: In test environments or offline local mode without valid Supabase service credentials, the worker automatically operates an in-memory queue store (`inMemoryJobs` map in `src/features/background-jobs/data-layer.ts`) providing identical atomic state transitions (`QUEUED` -> `RUNNING` -> `SUCCEEDED` / `FAILED` / `DEAD_LETTER`), priority ordering, and bounded retry semantics.

### 2.2. Concurrency Leases & Duplicate Protection
- **Lease Timeout**: Each claimed job is assigned an explicit lease expiration:
  $$\text{lease\_expires\_at} = \text{now}() + \text{leaseDurationSeconds} \quad (\text{default: } 300\text{ seconds})$$
- **Mutual Exclusion**: While a job is leased (`status = 'RUNNING'` and `lease_expires_at > now()`), other concurrent worker invocations cannot claim it.
- **Abandoned Lease Recovery**: If a worker node crashes or times out mid-execution, subsequent worker runs automatically reclaim the job once `lease_expires_at < now()`, incrementing `attempt_count`.
- **Idempotency Deduplication**: Unique partial index `uq_background_jobs_idempotency_key` on `background_jobs(idempotency_key)` rejects duplicate enqueueing of identical tasks (e.g. hourly cron maintenance tasks or webhook triggers).

### 2.3. Bounded Retries & Dead-Letter Observability
- **Retry Classification**: Errors are categorized into `TRANSIENT`, `PERMANENT`, `TIMEOUT`, `VALIDATION_FAILED`, or `INVARIANT_VIOLATION`.
- **Exponential Backoff**: Transient errors are scheduled for future execution with exponential backoff and jitter (`DEFAULT_MAX_ATTEMPTS = 5`).
- **Dead-Letter Handling**: Once `attempt_count >= max_attempts`, the job transitions to `DEAD_LETTER` status, and an immutable security audit event `BACKGROUND_JOB_DEAD_LETTER` is logged via `recordAuditLog()`.
- **Privacy Sanitization**: All logged and persisted error strings pass through `sanitizeErrorMessage()`, which redacts `Bearer` tokens, API keys, passwords, and secrets before persisting.

---

## 3. Scheduler Invocation Path & Verification

### 3.1. Invocation Route & Security Invariants
- **Platform Schedule**: `vercel.json` defines recurring automated triggers:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/process-jobs",
        "schedule": "*/5 * * * *"
      }
    ]
  }
  ```
- **Execution Endpoint**: `POST` / `GET` `/api/cron/process-jobs`.
- **Fail-Closed Authentication**: The endpoint enforces shared-secret validation (`CRON_SECRET` or `SCHEDULER_SECRET`).
  - Missing secret in environment $\to$ HTTP 401 Unauthorized.
  - Missing secret in request header $\to$ HTTP 401 Unauthorized.
  - Invalid / mismatched secret $\to$ HTTP 401 Unauthorized.
- **Audit & Timing Record**: Each execution cycle records `setLastWorkerRunTimestamp` and `setLastWorkerAttemptTimestamp`, surfacing in system capability readiness reports.

### 3.2. Operator Steps to Verify Worker Execution
1. Trigger an authenticated manual probe against the deployment:
   ```bash
   curl -X POST "https://<your-app-domain>/api/cron/process-jobs" \
     -H "Authorization: Bearer <YOUR_CRON_SECRET>" \
     -H "Content-Type: application/json"
   ```
2. Verify response payload:
   ```json
   {
     "success": true,
     "data": {
       "workerId": "scheduler_cron_worker",
       "claimedCount": 1,
       "succeededCount": 1,
       "failedCount": 0,
       "deadLetterCount": 0
     }
   }
   ```
3. Check the admin readiness report (`/admin` or `generateProductionReadinessReport()`) to confirm the `Scheduled Jobs & Recurring Tasks (Cron)` status is promoted to `VERIFIED` with the latest execution timestamp.

---

## 4. Payment Provider Sandbox Verification & Webhook Setup

### 4.1. Paystack Sandbox Verification Steps
1. **Acquire Test Keys**: From your [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer), obtain:
   - Secret Key: `sk_test_...`
   - Public Key: `pk_test_...`
2. **Configure Environment**:
   ```bash
   PAYSTACK_SECRET_KEY=sk_test_...
   PAYSTACK_PUBLIC_KEY=pk_test_...
   PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret
   ```
3. **Register Webhook Endpoint**:
   - URL: `https://<your-app-domain>/api/webhooks/paystack`
   - Event Triggers: `charge.success`
4. **Verify First Authentic Sandbox Event**:
   - Initiate checkout on `/cart` or `/orders/[id]/pay` using Paystack test card credentials (`4084 0840 0840 0840`, PIN `1111`, OTP `123456`).
   - Confirm Paystack server sends HMAC-SHA512 signed webhook to `/api/webhooks/paystack`.
   - Inspect database table `payment_webhook_events`:
     ```sql
     SELECT provider, event_id, event_type, status, created_at 
     FROM public.payment_webhook_events 
     WHERE provider = 'PAYSTACK';
     ```
   - Receipt of this authentic journal entry automatically promotes Paystack readiness status to **`VERIFIED`**.

### 4.2. Flutterwave Sandbox Verification Steps
1. **Acquire Test Keys**: From your [Flutterwave Dashboard](https://app.flutterwave.com/dashboard/settings/apis), obtain:
   - Secret Key: `FLWSECK_TEST-...`
   - Public Key: `FLWPUBK_TEST-...`
   - Secret Hash (verif-hash): Custom alphanumeric string configured in Webhooks settings.
2. **Configure Environment**:
   ```bash
   FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
   FLUTTERWAVE_WEBHOOK_SECRET=<your_configured_secret_hash>
   ```
3. **Register Webhook Endpoint**:
   - URL: `https://<your-app-domain>/api/webhooks/flutterwave`
4. **Verify First Authentic Sandbox Event**:
   - Initiate checkout using Flutterwave test card credentials.
   - Confirm Flutterwave dispatches webhook with `verif-hash` header.
   - Query `public.payment_webhook_events` for `FLUTTERWAVE` journal entry.

### 4.3. Authoritative Webhook Security Guarantees
- **Payload Bounding**: Both webhook handlers reject payloads exceeding 1MB (`400 Bad Request`).
- **Timing-Safe Cryptographic Validation**: `crypto.timingSafeEqual` prevents side-channel timing attacks on signatures.
- **Idempotency Journaling**: Database unique constraint `(provider, event_id)` on `payment_webhook_events` returns `200 OK ("Event already processed")` without re-processing duplicate deliveries.

---

## 5. Notification Provider Capability Truthfulness

| Delivery Channel | Implementation Class | Operational Status | Production Behavior |
| :--- | :--- | :--- | :--- |
| **In-App Notifications** | `InAppDeliveryProvider` | **VERIFIED** | Inserted directly into `public.notifications` table; real-time badges and queries functional. |
| **SMS** | `UnavailableDeliveryProvider` | **UNAVAILABLE** | Fails safely with `status: "UNAVAILABLE"` without faking transmissions. Operator must supply Twilio / Termii SDK credentials when activating carrier SMS. |
| **WhatsApp** | `UnavailableDeliveryProvider` | **UNAVAILABLE** | Fails safely with `status: "UNAVAILABLE"`. Preserves zero-fake-transmission invariant. |
| **Push Notifications** | `UnavailableDeliveryProvider` | **UNAVAILABLE** | Fails safely with `status: "UNAVAILABLE"`. |

---

## 6. Required Environment Configuration by Purpose

| Variable Name | Purpose | Sensitivity | Where Configured |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project REST URL | Public | Vercel Project Settings / `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Client Anon Key | Public (RLS protected) | Vercel Project Settings / `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client for background worker & secure mutations | **Secret (High)** | Vercel Environment Variables only |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for redirect URLs & webhooks | Public | Vercel Project Settings |
| `CRON_SECRET` | Secret token authorizing `/api/cron/process-jobs` | **Secret (High)** | Vercel Environment Variables |
| `PAYSTACK_SECRET_KEY` | Paystack server-to-server API secret | **Secret (High)** | Vercel Environment Variables |
| `PAYSTACK_PUBLIC_KEY` | Paystack inline checkout public key | Public | Vercel Project Settings |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack HMAC-SHA512 webhook signature secret | **Secret (High)** | Vercel Environment Variables |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave API secret key | **Secret (High)** | Vercel Environment Variables |
| `FLUTTERWAVE_PUBLIC_KEY` | Flutterwave checkout public key | Public | Vercel Project Settings |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Flutterwave `verif-hash` secret header | **Secret (High)** | Vercel Environment Variables |
| `GEMINI_API_KEY` | Google Gemini 2.0 API key for agronomic advisory | **Secret (Medium)** | Vercel Environment Variables |

---

## 7. Disaster Recovery & Backup / PITR Verification

Because AgroMarket uses managed Supabase PostgreSQL, physical WAL archiving, daily database snapshots, and Point-in-Time Recovery (PITR) reside at the cloud platform infrastructure layer and cannot be introspected via application SQL queries.

### Operator PITR Verification Steps:
1. Log into the [Supabase Management Console](https://supabase.com/dashboard/project/_/database/backups/pitr).
2. Select your production project $\to$ **Database** $\to$ **Backups**.
3. Verify that **Point-in-Time Recovery (PITR)** is enabled (available on Pro and Team plans).
4. Note the retention window (typically 7 to 28 days).
5. Capture a manual snapshot before each production milestone.

---

## 8. Launch-Blocker Checklist

### Group A: Code & Repository Verification (COMPLETED)
- [x] Zero-tolerance anti-pork invariant enforced across catalog, search, RAG, and notifications.
- [x] Atomic job claiming via PostgreSQL `claim_background_jobs` (`FOR UPDATE SKIP LOCKED`).
- [x] Concurrency lease management and abandoned job recovery.
- [x] Scheduler endpoint fails closed on missing/invalid secret token.
- [x] Webhook handlers reject oversized bodies and verify cryptographic signatures.
- [x] Webhook duplicate journal deduplication active via `payment_webhook_events`.
- [x] Readiness report attaches defensible `evidenceTimestamp` and sandbox mode annotations.
- [x] Privacy sanitization strips credentials from error messages.

### Group B: Deployment Configuration (Operator Action in Vercel)
- [ ] Set `CRON_SECRET` in Vercel project environment variables.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel project environment variables.
- [ ] Configure `NEXT_PUBLIC_APP_URL` matching the production domain.
- [ ] Confirm `vercel.json` cron entry triggers `/api/cron/process-jobs`.

### Group C: External Account Actions (Operator Action in Dashboards)
- [ ] Register `/api/webhooks/paystack` in Paystack dashboard with `PAYSTACK_WEBHOOK_SECRET`.
- [ ] Register `/api/webhooks/flutterwave` in Flutterwave dashboard with `FLUTTERWAVE_WEBHOOK_SECRET`.
- [ ] Verify first authentic sandbox charge event arrives in `public.payment_webhook_events`.
- [ ] Verify Supabase PITR backup retention in Supabase dashboard.
