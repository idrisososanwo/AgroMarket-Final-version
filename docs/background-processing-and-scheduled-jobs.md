# AgroMarket Background Processing, Scheduled Jobs & Retry Foundation (Phase 3.17)

## 1. Executive Architecture Summary

Phase 3.17 introduces an asynchronous job execution and scheduling engine for AgroMarket. The system delivers a minimal, production-conscious background processing foundation that integrates directly with existing PostgreSQL/Supabase database capabilities, avoiding extraneous infrastructure components (e.g., Redis, BullMQ, RabbitMQ, SQS, or Celery).

### Architecture Selected & Justification

* **Database Engine**: PostgreSQL via Supabase Database.
* **Atomic Claiming Primitive**: `FOR UPDATE SKIP LOCKED` inside a PL/pgSQL database function (`public.claim_background_jobs`).
* **Why**:
  1. **Zero External Dependencies**: Reuses the already configured Supabase PostgreSQL instance without introducing operational overhead, extra hosting costs, or distributed state synchronization challenges.
  2. **ACID Transaction Guarantees**: Transaction-level locking guarantees that exactly one worker instance claims any single queued task batch, completely preventing duplicate execution.
  3. **Row-Level Security & Auditing**: Direct integration with PostgreSQL RLS policies and AgroMarket's unified audit log (`public.audit_logs`).
  4. **Strict Zero-Tolerance Anti-Pork Enforcement**: Enforces platform-wide anti-pork invariants directly at the database level with a table `CHECK` constraint in addition to Zod schemas and application code checks.

---

## 2. Existing Infrastructure Reused

Phase 3.17 reuses existing platform subsystems:

1. **Phase 3.16 Notifications & Delivery Records**:
   * Uses `delivery_records`, `recipient_targeting`, user quiet-hour and notification preference gates, and truthful external channel status (`UNAVAILABLE` for external SMS/WhatsApp/Push gateways).
   * Reuses notification deduplication and idempotency keys to guarantee at-most-once user receipt.
2. **Phase 3.16 Agricultural Intelligence Alerts**:
   * Respects alert approval workflow states (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `WITHHELD`, `EXPIRED`).
   * Never dispatches unapproved or withheld intelligence.
3. **Phase 3.15 Market Intelligence Domain Services**:
   * Reuses `calculateCommodityPriceTrend` from `src/features/market-intelligence/calculations.ts`.
   * Strictly avoids synthesizing synthetic or simulated market observations.
4. **Phase 3.11 Supply Matching & Commitment Services**:
   * Reuses supply commitment quantity validation logic for safe, idempotent fulfilment reconciliation.
5. **Phase 3.14 Governance & Audit Logging Engine**:
   * Emits structured audit events (`BACKGROUND_JOB_WORKER_CYCLE`, `BACKGROUND_JOB_DEAD_LETTER`) to `recordAuditLog`.
6. **Platform Anti-Pork Invariant**:
   * Reuses `assertNoProhibitedProduce` and `PROHIBITED_PRODUCE_TERMS` to reject porcine commodities across job payloads, metadata, and error messages.

---

## 3. Job Domain and Lifecycle

### Lifecycle State Machine

```
                  ┌───────────────┐
                  │    QUEUED     │◀──────────────┐ (Retryable Failure
                  └───────┬───────┘               │  with Backoff Delay)
                          │                       │
                     claimJobs()                  │
                          │                       │
                          ▼                       │
                  ┌───────────────┐               │
                  │    RUNNING    │───────────────┤
                  └───────┬───────┘               │
                          │                       │
        ┌─────────────────┼───────────────────────┤
        │                 │                       │
        ▼                 ▼                       ▼
┌───────────────┐ ┌───────────────┐       ┌───────────────┐
│   SUCCEEDED   │ │    FAILED     │       │  DEAD_LETTER  │
└───────────────┘ └───────────────┘       └───────────────┘
  (Terminal)        (Exhausted /            (Poison Pill /
                     Terminal)               Manual Review)
```

### Valid State Transitions

| From State | Allowed Target States | Trigger / Condition |
| :--- | :--- | :--- |
| `QUEUED` | `RUNNING` | Atomic claim by worker via lease acquisition |
| `RUNNING` | `SUCCEEDED` | Handler successfully completed payload execution |
| `RUNNING` | `QUEUED` | Transient error occurred and attempts < maxAttempts (with backoff `run_after`) |
| `RUNNING` | `FAILED` | Permanent error, validation failure, or attempts exhausted |
| `RUNNING` | `DEAD_LETTER` | Invariant violation (e.g. anti-pork attempt) or poison pill payload |
| `FAILED` | `QUEUED` | Authorized administrative manual retry |
| `DEAD_LETTER`| `QUEUED` | Authorized administrative manual replay after payload inspection |

### Job Entity Schema

Each job record in `public.background_jobs` maintains:
* `id` (UUID, primary key)
* `job_type` (Allowlisted enum)
* `status` (`QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `DEAD_LETTER`)
* `priority` (Integer: higher priority processed first, e.g. 100 for alerts, 50 for retries, 10 for background reconciliations)
* `payload` (JSONB validated against Zod schema)
* `result` (JSONB execution summary)
* `attempt_count` (Integer, tracking run attempts)
* `max_attempts` (Integer, bounded by default 3, max 10)
* `run_after` (TIMESTAMPTZ, eligible run time)
* `idempotency_key` (Unique constraint across non-terminal jobs)
* `claimed_by` (Worker instance identifier)
* `lease_expires_at` (TIMESTAMPTZ, lease duration for abandoned job reclamation)
* `last_error_category` (`TRANSIENT`, `PERMANENT`, `VALIDATION_FAILED`, `INVARIANT_VIOLATION`, `CANCELLED`, `TIMEOUT`)
* `last_error_message` (Sanitized, credential-stripped error summary)
* `created_at`, `started_at`, `completed_at`, `failed_at`

---

## 4. Safe Job Claiming, Leases, Retries & Idempotency

### Atomic Claiming (`FOR UPDATE SKIP LOCKED`)
The PostgreSQL stored function `claim_background_jobs` atomically selects up to `batch_size` jobs matching:
1. `status = 'QUEUED'` AND `run_after <= NOW()`
2. OR `status = 'RUNNING'` AND `lease_expires_at < NOW()` (automatically recovering crashed or abandoned workers)
3. Locks the candidate rows with `FOR UPDATE SKIP LOCKED` so concurrent workers claim distinct disjoint sets of jobs without lock contention or thread blocking.
4. Marks claimed rows as `RUNNING`, updates `claimed_by` and sets `lease_expires_at = NOW() + lease_duration`.

### Lease Recovery Semantics
* Leases default to 300 seconds (configurable up to 1800s).
* If a worker process crashes mid-execution, its lease expires, and the next worker cycle reclaims the job without manual intervention.

### Bounded Exponential Backoff with Jitter
For transient errors, backoff delay is calculated as:
$$\text{Delay} = \min(\text{baseDelay} \times 2^{(\text{attempt} - 1)} + \text{jitter}, \text{maxDelay})$$
* Base delay: 30 seconds
* Multiplier: 2.0
* Max delay: 3,600 seconds (1 hour)
* Jitter: Uniform random variance [0, 5000ms] to avoid synchronized retry stampedes.

### Transient vs Permanent Failure Classification
* **Transient (`TRANSIENT`, `TIMEOUT`)**: Network socket disconnects, rate limits (HTTP 429), database transaction lock contention (55P03 / 40P01), remote 503/504 errors. Eligible for retry if `attemptCount < maxAttempts`.
* **Permanent (`PERMANENT`, `VALIDATION_FAILED`, `INVARIANT_VIOLATION`)**: Zod schema failures, unauthorized scheduler tokens, non-existent entity references, anti-pork violations. Marked `FAILED` or `DEAD_LETTER` immediately with zero retries.

### Idempotency Enforcement
* Jobs enforce unique deduplication keys via `idempotency_key`.
* Enqueueing an identical `idempotency_key` while an earlier job is in `QUEUED` or `RUNNING` status safely returns the existing job without duplicating work.

---

## 5. Workflows Integrated

The following five high-value workflows are supported:

### A. Approved Agricultural Alert Dispatch (`DISPATCH_APPROVED_ALERT`)
* Consumes only alerts in `PUBLISHED` state.
* Rejects `DRAFT`, `PENDING_REVIEW`, `WITHHELD`, and `EXPIRED` alerts.
* Enforces recipient targeting, farmer preferences, quiet-hour rules, and severity levels.
* External delivery channels (SMS, WhatsApp, Push) maintain truthful `UNAVAILABLE` status without fabricating delivery receipts.
* In-app notifications are delivered and recorded immediately.

### B. Notification Delivery Retry (`RETRY_NOTIFICATION_DELIVERY`)
* Retries only notifications in `FAILED` status with transient failure codes.
* Enforces channel availability: if external channels remain unavailable, the delivery record stays honestly marked as `FAILED` (with reason `CHANNEL_UNAVAILABLE`) and will not be endlessly retried once maximum attempts are reached.
* Idempotent: Prevents duplicate delivery receipts for already delivered notifications.

### C. Expire Stale Alerts (`EXPIRE_STALE_ALERTS`)
* Scans alerts where `expires_at <= NOW()` and `status != 'EXPIRED'`.
* Safely transitions alert status to `EXPIRED`.
* Preserves underlying observation data without mutation.

### D. Refresh Market Intelligence Projections (`REFRESH_MARKET_INTELLIGENCE`)
* Recalculates commodity price trends deterministically using `calculateCommodityPriceTrend`.
* Uses only recorded observations from `public.raw_price_observations`.
* Never generates synthetic prices, fake observations, or hallucinated forecasts.

### E. Reconcile Supply Fulfilment (`RECONCILE_SUPPLY_FULFILMENT`)
* Reconciles recorded order items against supply commitments.
* Strictly enforces positive quantities and commodity legitimacy.
* Pure deterministic reconciliation without financial transfers or automated culling.

---

## 6. Scheduler and Worker Entry Points

### Execution Routes
* **HTTP Route**: `/api/cron/process-jobs`
* **Supported Methods**: `POST` (trigger cycle with optional overrides), `GET` (lightweight cron ping)
* **Authentication**: Strict fail-closed validation using `CRON_SECRET` or `SCHEDULER_SECRET`.
  * Accepted formats: `Authorization: Bearer <CRON_SECRET>` or direct header `x-cron-secret: <CRON_SECRET>`.
  * Returns `401 Unauthorized` if secret is missing, mismatched, or empty.

### Server Actions
* `getQueueMetricsAction`: Requires authenticated admin (`ADMIN` role in `profiles`).
* `getFailedJobsAction`: Requires authenticated admin.
* `retryFailedJobAction`: Allows admin to reschedule an exhausted `FAILED` job to `QUEUED`.
* `triggerWorkerCycleAction`: Allows manual cycle trigger by authenticated platform administrator.

### Deployment Configuration (Vercel Cron / External Cron)
To activate scheduled background processing:
1. Set environment variable `CRON_SECRET` in your hosting dashboard (e.g. Vercel Project Settings > Environment Variables).
2. Configure `vercel.json` crons:
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
3. When deployed, Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` with each scheduled request.

> **Verification Note**: Currently, `CRON_SECRET` is configured in `.env.local` for local and staging tests. In production environments where automated crons are not enabled, administrative triggers (`triggerWorkerCycleAction`) and external webhook runners (e.g., Supabase pg_cron or GitHub Actions) are supported.

---

## 7. Security, Privacy, Governance & Anti-Pork Guardrails

1. **Least-Privilege Database Grants**:
   * Public/anon roles have zero permissions on `public.background_jobs`.
   * Only `authenticated` users can read non-sensitive queue metrics.
   * Only `service_role` (used by server-side workers) can insert, update, or invoke `claim_background_jobs`.
2. **Strict Payload Allowlisting**:
   * Zod schemas validate every payload field before insertion.
   * Unknown job types are rejected with `VALIDATION_FAILED`.
3. **Privacy & Credential Sanitization**:
   * Function `sanitizeErrorMessage` removes API keys, bearer tokens, passwords, and sensitive JWTs from error messages before storing in `last_error_message`.
   * Routine worker logs omit personal recipient information (emails, phone numbers).
4. **Zero-Tolerance Anti-Pork Invariant**:
   * Checked in:
     * Database check constraint: `background_jobs_anti_pork_chk`
     * Zod payload schemas: `assertNoProhibitedProduceBackgroundJob`
     * Handlers: Re-verified before processing commodity payloads
   * Any violation throws an `[ANTI_PORK_VIOLATION]` exception and permanently places the job into `DEAD_LETTER` with zero retries.
5. **No Autonomous Financial or Consequential Actions**:
   * Background jobs are strictly prohibited from initiating automatic monetary transfers, veterinary cullings, or quarantine orders.
   * High-impact agricultural alerts remain strictly gated by Phase 3.16 human approval review.

---

## 8. Operational Visibility & Inspection

### Queue Metrics (`QueueMetrics`)
* `totalQueued`: Number of pending jobs awaiting worker execution.
* `totalRunning`: Number of jobs currently being processed under active leases.
* `totalSucceeded`: Number of successfully executed jobs.
* `totalFailed`: Number of permanently failed or exhausted jobs.
* `totalDeadLetter`: Number of poison-pill or invariant-violating jobs.
* `countsByType`: Breakdown across the 5 allowlisted job types.
* `oldestQueuedAgeSeconds`: Queue lag indicator measuring the age of the oldest pending task.
* `lastWorkerRunAt`: Timestamp of the most recent worker cycle completion.

### Administrative Recovery
Administrators can inspect failed jobs using `getFailedJobsAction` and retry eligible jobs using `retryFailedJobAction`, which atomically resets the job's `status` to `QUEUED`, resets `attempt_count` to 0, and clears error details.

---

## 9. Known Limitations & Deferred Work

1. **Worker Concurrency Model**:
   * Runs in Next.js Serverless runtime batches. For ultra-high-frequency sub-second jobs, a dedicated long-running worker daemon (e.g., containerized Node.js service) would provide lower latency than HTTP cron triggers.
2. **External Delivery Provider Integration**:
   * As established in Phase 3.16, external SMS/WhatsApp/Push provider integrations are stubbed as `UNAVAILABLE` pending third-party gateway contracts. In-app notifications are fully operational.
3. **Database Streaming Queue**:
   * Currently uses polling on cron invocation rather than Supabase Realtime CDC (Change Data Capture) listening, which is the recommended and simplest design for scheduled and deferred batch workflows.
