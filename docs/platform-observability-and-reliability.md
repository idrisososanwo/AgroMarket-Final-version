# AgroMarket Platform Observability, Health Checks & Reliability Monitoring (Phase 3.18)

## 1. Executive Summary

Phase 3.18 introduces a dependable, low-overhead operational observability layer for the AgroMarket platform. It provides real-time visibility into application process viability, critical dependency health, background job processing queues, notification delivery integrity, and system thresholds.

The observability framework reports observed system state rather than inferring success from static code or configuration files, adhering strictly to least-privilege administrative access, privacy protection, and zero-tolerance anti-pork invariants.

---

## 2. Existing Infrastructure Reused

1. **Phase 3.17 Background Job Processing**:
   * Inspects `public.background_jobs` for status distributions, execution lag, lease expirations, and dead letters.
   * Reuses worker cycle timestamp tracking (`lastAttemptedRunAt` and `lastSuccessfulRunAt`).
2. **Phase 3.16 Notifications & Delivery Records**:
   * Inspects `public.agricultural_alerts` for publication state (`PUBLISHED`, `PENDING_REVIEW`, `EXPIRED`) and metadata integrity.
   * Tracks `public.notification_deliveries` across all channels (`IN_APP`, `SMS`, `WHATSAPP`, `EMAIL`, `PUSH`) and enforces truthful external provider statuses (`UNAVAILABLE`).
3. **Phase 3.14 Governance & Audit Logging Engine**:
   * Emits structured, redacted operational entries (`recordAuditLog`) and correlates trace IDs.
4. **Phase 1.0 RBAC and Authentication**:
   * Restricts detailed operational views and server actions strictly to verified users with the `ADMIN` role via `requireRole("ADMIN")`.
5. **Platform Zero-Tolerance Anti-Pork Invariant**:
   * Enforces rejection of porcine produce terms (`PROHIBITED_PRODUCE_TERMS`) across operational summaries, log entries, and health messages.

---

## 3. Health Check Concepts & Endpoint Semantics

### A. Liveness Probe (`/api/health/live`)
* **Purpose**: Verifies that the Node.js process is active and capable of handling incoming HTTP connections.
* **Semantics**: Fails closed only if the process runtime is unviable.
* **Independence**: **Never** depends on database connectivity, external APIs, or background workers.
* **Response Status**: HTTP 200 `HEALTHY`.
* **Payload**:
  ```json
  {
    "status": "HEALTHY",
    "uptimeSeconds": 142,
    "timestamp": "2026-10-09T11:45:00.000Z",
    "service": "agromarket-core"
  }
  ```

### B. Readiness Probe (`/api/health/ready`)
* **Purpose**: Indicates whether the application can serve its intended requests with its essential dependencies available.
* **Dependencies Checked**:
  1. **PostgreSQL Database Connectivity**: Runs a bounded query with a strict 3000ms timeout (`HEALTH_CHECK_TIMEOUT_MS`).
  2. **Essential Environment Configuration**: Verifies `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Semantics**:
  * Returns HTTP 200 `HEALTHY` when all essential dependencies are responsive.
  * Returns HTTP 503 `UNAVAILABLE` when the database fails or essential configuration is missing.
* **Privacy & Security**: Never reveals internal connection strings, database schemas, credentials, or stack traces to callers.

### C. Standard Health Endpoint (`/api/health`)
* Preserves backward compatibility while returning unified readiness checks.

---

## 4. Background Job & Queue Reliability Metrics

Phase 3.18 builds on Phase 3.17's database and worker primitives to compute the following bounded metrics:

| Metric | Type | Description |
| :--- | :--- | :--- |
| `countsByStatus` | Map | Counts by status: `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `DEAD_LETTER`. |
| `countsByType` | Map | Distribution across the 5 allowlisted job types. |
| `queueLagSeconds` | `number \| null` | Processing lag of the oldest eligible queued task (`now - run_after`). Returns `null` if no eligible jobs exist. |
| `oldestEligibleQueuedAgeSeconds`| `number \| null` | Elapsed time since creation for oldest eligible queued job. Returns `null` if queue is clear. |
| `expiredLeasesCount` | `number` | Number of `RUNNING` jobs whose lease timestamp has expired, awaiting recovery. |
| `recoverableAbandonedJobsCount` | `number` | Same as expired leases; recoverable by subsequent worker cycles. |
| `retryableFailuresCount` | `number` | Failed jobs with `TRANSIENT` error category and remaining attempts. |
| `terminalDeadLetterCount` | `number` | Poison-pill or invariant-violating jobs permanently in `DEAD_LETTER`. |
| `lastAttemptedWorkerCycle` | `string \| null`| Timestamp of the most recent worker batch start. |
| `lastSuccessfulWorkerCycle` | `string \| null`| Timestamp of the most recent worker batch completion. |

* **Precision Guarantee**: Missing metrics are explicitly reported as `null` or `unmeasured` rather than inventing a zero value.
* **Query Bounding**: All database queries enforce strict `.limit(...)` constraints to prevent unbounded memory loading.

---

## 5. Notification and Alert Monitoring

Phase 3.18 surfaces operational metrics from the intelligence and delivery pipeline:

1. **Published Alerts Pending Dispatch**: Count of active `PUBLISHED` alerts that have not expired.
2. **Pending Review Queue (`PENDING_REVIEW`)**: Alerts requiring human agronomist/compliance officer review before publication.
   > **Operational Note**: A pending human review is explicitly treated as an operational attention queue, **never** as a system failure.
3. **Expired Alerts Requiring Cleanup**: Alerts where `expires_at <= NOW()` that remain in `PUBLISHED` status, flagging the need for `EXPIRE_STALE_ALERTS` background task execution.
4. **Channel Delivery Breakdown**: Aggregation of deliveries by `(channel, status)`.
5. **Truthful Provider Availability**: External channels (`SMS`, `WHATSAPP`, `EMAIL`, `PUSH`) truthfully report `UNAVAILABLE` pending third-party gateway contracts.
6. **Repeated Delivery Failures**: Deliveries that failed after reaching $\ge 3$ attempts.
7. **Metadata Integrity**: Flags alerts lacking required provenance or confidence metadata.

---

## 6. Reliability Rules & Warning Thresholds

Configured conservative warning thresholds in `src/features/observability/constants.ts`:

* **Maximum Queue Lag**: Warning at 300s (5m), Critical at 900s (15m).
* **Oldest Queued Job Age**: Warning at 600s (10m), Critical at 1800s (30m).
* **Dead-Letter Growth**: Warning if $> 0$, Critical if $\ge 10$.
* **Stale Worker Activity**: Warning if worker has been idle for $> 15\text{m}$ while jobs are queued; Critical if idle $> 60\text{m}$.
* **Expired Alerts Remaining Eligible**: Warning if $> 0$.
* **Notification Failure Rate**: Warning if delivery failures $> 10\%$ with $\ge 3$ failures.

> **Safety Invariant**: A warning threshold **never** silently alters job status, publishes an alert, bypasses governance, or triggers consequential actions.

---

## 7. Security, Privacy & Anti-Pork Safeguards

1. **Administrator Restriction**:
   * Detailed operational metrics and dashboard pages are restricted to users with `ADMIN` role via server-side session and database role checks (`requireRole("ADMIN")`).
2. **Credential & Secret Redaction**:
   * `logOperationalEvent` and `sanitizeErrorMessage` strip API keys, bearer tokens, passwords, and JWTs from log summaries.
3. **No Unauthenticated Triggers**:
   * No public endpoint exists that allows external callers to execute worker cycles, clear queues, or alter job statuses.
4. **Zero-Tolerance Anti-Pork Enforcement**:
   * Checked across log summaries and newly generated operational text. Any violation throws `[ANTI_PORK_VIOLATION]` and suppresses the message.
5. **Failsafe Execution Wrapper (`safeExecuteMonitored`)**:
   * Guarantees that monitoring, logging, or metric calculation failures never interrupt core transactional business operations.

---

## 8. Operational Dashboard View

* **Route**: `/admin/operations`
* **Access**: Superusers / Compliance Officers with `ADMIN` role.
* **Navigation**: Accessible directly from `/admin` control console.
* **Features**:
  * Overall service status badge (`HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `UNKNOWN`).
  * Real-time warning diagnostics.
  * Background queue metrics (lag, oldest job age, dead letters, expired leases).
  * Worker and scheduler activity (last attempted, last successful, scheduler status).
  * Alert and delivery pipeline health (pending human review queue, channel delivery breakdown).
  * Truthful external provider status table.
  * **Read-Only**: Strictly displays status without mutating application state.

---

## 9. Live Configuration Status vs Supported Capabilities

* **Liveness & Readiness Probes**: **Live & Active** on `/api/health/live` and `/api/health/ready`.
* **Queue & Delivery Metrics**: **Live & Active** in database queries and memory fallbacks.
* **Administrator Operations Console**: **Live & Active** at `/admin/operations`.
* **External Delivery Channels**: **Supported but Truthfully Unavailable** until external SMS/WhatsApp contracts are finalized.
* **Cron Scheduling**: **Supported**: Route `/api/cron/process-jobs` is live and secured with `CRON_SECRET`; automated execution depends on deployment environment configuration (e.g., Vercel Cron or Supabase `pg_cron`).
