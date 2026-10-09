# AgroMarket Phase 3.16 — Agricultural Intelligence Notifications & Alert Delivery Foundation

## 1. Executive Summary

Phase 3.16 establishes the **Agricultural Intelligence Notifications and Alert Delivery Foundation** in AgroMarket. It connects upstream agricultural intelligence systems (Market Intelligence, Production Planning, Disease & Biosecurity, Food Security & Resilience, and Logistics Intelligence) directly to platform users through a deterministic, governed, and multi-channel delivery pipeline.

```
┌────────────────────────────────────────────────────────────────────────┐
│               Upstream Agricultural Intelligence System                 │
│  (Market Signals, Disease Advisories, Harvest Guidance, Logistics)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Ingest & Validation Pipeline                         │
│  - Zero-Tolerance Anti-Pork Enforcement                                │
│  - Temporal Validity & Expiry Check                                    │
│  - Idempotency & Deduplication Guard                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Governance Evaluation & Review Gate                      │
│  - Canonical Agent Mapping & Intelligence Governance Policy Check      │
│  - HIGH/CRITICAL Biosecurity & Food Security -> PENDING_REVIEW         │
│  - Informational / Routine Alerts -> Auto-Approved (PUBLISHED)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Audience Targeting & Quiet Hours Evaluation                │
│  - Match Roles, States, LGAs, Commodities, Severity Thresholds         │
│  - Quiet Hours Window Suppression (CRITICAL alerts bypass)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Multi-Channel Delivery Dispatch                      │
│  - In-App: Delivered Live to User Inbox (DELIVERED)                    │
│  - SMS / WhatsApp / Email / Push: Truthful Fallback (UNAVAILABLE)      │
│  - Audit Record Written to notification_deliveries                     │
└────────────────────────────────────────────────────────────────────────┘
```

The system preserves strict architectural integrity:
- **No autonomous consequential actions**: Advisories and notifications never claim diagnostic certainty or issue executive orders without human confirmation.
- **Truthful channel reporting**: External delivery providers (SMS, WhatsApp, Push) honestly report `UNAVAILABLE` (`PROVIDER_UNAVAILABLE`) rather than manufacturing fake delivery confirmations.
- **Strict separation of concerns**: Distinct models for the Alert Definition, User Notification Receipt, Channel Delivery Record, and User Preferences.

---

## 2. Infrastructure Reused & Separation of Concerns

Phase 3.16 builds directly upon AgroMarket's existing database, authentication, and governance infrastructure rather than creating duplicative subsystems:

### 2.1 Reused Infrastructure

1. **`notifications` Table**:
   - Reused as the canonical user in-app notification inbox.
   - Extended with backward-compatible columns: `alert_id`, `severity`, `expires_at`, `idempotency_key`, `acknowledged_at`, `dismissed_at`, `source_reference`, `source_system`, `confidence`.
   - Backward compatibility: Legacy `NotificationService.sendNotification` calls continue to function identically for settlement and dispute alerts.

2. **`profiles` and Auth Roles**:
   - Candidates are queried from `profiles` joining active roles, states, and LGAs.
   - User targeting leverages AgroMarket's canonical `ActorRole` set (`FARMER`, `BUYER`, `BUSINESS`, `SERVICE_PROVIDER`, `EQUIPMENT_OWNER`, `EXPERT`, `ADMIN`, `JOB_SEEKER`) plus coordinator designations.

3. **Intelligence Governance Policy Engine**:
   - Reuses `evaluateGovernancePolicy` from Phase 3.0.
   - Alerts map directly to their canonical agent (`MARKET_INTELLIGENCE_AGENT`, `PRODUCTION_PLANNING_AGENT`, `AGRICULTURAL_DISEASE_BIOSECURITY_AGENT`, `FOOD_SECURITY_RESILIENCE_AGENT`, `LOGISTICS_INTELLIGENCE_AGENT`).

4. **Action Integration Route Validation**:
   - Reuses `VALID_AGROMARKET_ACTION_ROUTES` and action destination models, adding `/notifications` as an official platform destination route.

### 2.2 Relational Separation of Concerns

| Entity | Database Table | Purpose | Lifecycle State |
|---|---|---|---|
| **Alert Definition** | `agricultural_intelligence_alerts` | Grounded canonical alert with provenance, confidence, source reference, and target audience | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `WITHHELD`, `EXPIRED` |
| **User Notification Receipt** | `notifications` | In-app notification state specific to an individual recipient | Unread (`is_read: false`), Read (`read_at`), Acknowledged (`acknowledged_at`), Dismissed (`dismissed_at`) |
| **Delivery Record** | `notification_deliveries` | Audit log per transmission channel attempt | `QUEUED`, `ATTEMPTED`, `ACCEPTED`, `DELIVERED`, `FAILED`, `UNAVAILABLE` |
| **User Preferences** | `user_alert_preferences` | User-configured category opt-ins, quiet hours, and minimum severity thresholds | Persistent user profile settings |

---

## 3. Multi-Channel Delivery Model & Truthful Status Semantics

### 3.1 Delivery Channels

AgroMarket supports five delivery channels across agricultural operations:
- **`IN_APP`**: Real-time web application notification center.
- **`SMS`**: Cellular text messaging for low-connectivity rural producers.
- **`WHATSAPP`**: Messaging channel for trade groups and off-take cooperatives.
- **`EMAIL`**: Summaries and documentation for institutional buyers and aggregators.
- **`PUSH`**: Mobile push alerts for urgent field and market signals.

### 3.2 Truthful Delivery Invariant (Zero-Faking Policy)

In accordance with AgroMarket platform integrity principles:
- **`IN_APP` is fully functional and live**: Creates notification items in the database and updates unread counts immediately with status `DELIVERED`.
- **External channels (`SMS`, `WHATSAPP`, `EMAIL`, `PUSH`) report honest unavailability**:
  - Provider returns `{ success: false, status: "UNAVAILABLE", errorCode: "PROVIDER_UNAVAILABLE", errorMessage: "External provider integration not configured in current environment" }`.
  - The delivery audit table faithfully stores `delivery_status = 'UNAVAILABLE'`.
  - The system **never** marks an unintegrated external delivery as `DELIVERED` or `SENT`.

### 3.3 Provider Registry Architecture

Delivery providers implement the strict interface:
```typescript
export interface DeliveryProvider {
  channel: DeliveryChannel;
  isAvailable(): boolean;
  deliver(payload: DeliveryPayload): Promise<DeliveryResult>;
}
```
A provider registry allows registering mock or test providers during testing and cleanly plugging in production gateways (e.g., Twilio, Termii, Meta WhatsApp Cloud API) when external credentials are provisioned.

---

## 4. Audience Targeting, Eligibility, and Quiet Hours Engine

Alert targeting is deterministic, evaluated user-by-user against explicit criteria:

### 4.1 Targeting Rules

1. **Category Preferences**:
   - A user will not receive an alert if the category is in `optedOutCategories`.
   - If `enabledCategories` is configured, the alert category must be present.
2. **Severity Minimum Threshold**:
   - User threshold ranking: `INFO (0) < LOW (1) < MEDIUM (2) < HIGH (3) < CRITICAL (4)`.
   - Alerts with severity rank lower than the user's configured minimum are filtered out.
3. **Role Targeting**:
   - If `targetAudience.roles` is specified, the user must hold at least one matching role.
4. **Geographic State & LGA Targeting**:
   - If `targetAudience.states` is set, the user's primary state or preferred monitored states must match.
   - If `targetAudience.lgas` is set, the user's primary LGA or preferred LGAs must match.
5. **Commodity Interest**:
   - If targeted commodities are specified, user's monitored commodities must match.

### 4.2 Quiet Hours Window

- Configured per user via `quietHoursStartUtc` and `quietHoursEndUtc` (e.g., `"21:00"` to `"05:00"`).
- Handles single-day and overnight windows across UTC time boundaries.
- **Critical Alert Bypass**: `CRITICAL` severity alerts bypass quiet hours immediately to ensure life-safety, severe disease outbreaks, and biosecurity threats reach relevant operators without delay. Non-critical alerts are suppressed.

---

## 5. Governance, Human-in-the-Loop Review, and Safety Invariants

### 5.1 Human-in-the-Loop Review Gate

High-impact alerts require human oversight before public dissemination:
- Any `DISEASE_BIOSECURITY_ADVISORY` or `FOOD_SECURITY_ALERT` with severity `HIGH` or `CRITICAL` is placed into `PENDING_REVIEW` with `requiresHumanReview = true`.
- Dispatch is withheld until an authorized human coordinator or agricultural administrator explicitly invokes `approveAndPublishAlert(alertId, reviewerUserId)`.
- Routine, informational, and price notifications publish automatically via canonical domain agents.

### 5.2 Advisory-Only Invariant

Agricultural disease advisories must adhere strictly to supportive guidance:
- Advisories must use advisory, preventative, and diagnostic consultation phrasing.
- Ingestion strictly forbids declarative diagnoses, autonomous livestock culling mandates, or quarantine orders without veterinarian or ministry validation.

### 5.3 Zero-Tolerance Anti-Pork Produce Invariant

AgroMarket enforces an absolute ban on pork, swine, bacon, pig, and derived byproducts:
- Enforced at all system boundaries by `assertNoProhibitedProduceNotification`.
- Recursively validates alert titles, summaries, messages, commodity names, conflict explanations, metadata payloads, and user monitoring preferences.
- Throws an unswallowable error prefixed with `[ANTI_PORK_VIOLATION]` upon any occurrence.

### 5.4 Untrusted Client Target Guard

- Alert ingestion and user notification actions run on the server via Next.js Server Actions.
- Client requests cannot forge recipient user IDs or modify delivery statuses.
- User notification queries enforce session authentication and user ID tenancy isolation.

---

## 6. Data Model & Database Migration

Migration `supabase/migrations/20261009110000_phase_3_16_intelligence_notifications.sql` provisions:

1. **`agricultural_intelligence_alerts`**:
   - Columns: `id`, `category`, `severity`, `title`, `summary`, `source_entity_type`, `source_reference`, `source_provenance`, `confidence_level`, `confidence_score`, `valid_from`, `expires_at`, `is_historical`, `has_conflicts`, `conflict_explanation`, `target_audience`, `publication_status`, `requires_human_review`, `reviewed_by`, `reviewed_at`, `deduplication_key`, `metadata`, `created_at`, `updated_at`.
2. **`notification_deliveries`**:
   - Columns: `id`, `notification_id`, `alert_id`, `user_id`, `channel`, `delivery_status`, `attempt_count`, `last_attempt_at`, `delivered_at`, `error_code`, `error_message`, `provider_response`, `created_at`.
3. **`user_alert_preferences`**:
   - Columns: `user_id`, `enabled_categories`, `severity_threshold`, `enabled_channels`, `preferred_states`, `preferred_lgas`, `monitored_commodities`, `quiet_hours_enabled`, `quiet_hours_start_utc`, `quiet_hours_end_utc`, `opted_out_categories`, `updated_at`.
4. **Indexes & RLS**:
   - Foreign keys linking `notifications.alert_id` and `notification_deliveries.alert_id`.
   - Fast lookup indexes on `publication_status`, `category`, `severity`, `user_id`, `channel`, and `delivery_status`.
   - Row-level security ensuring users can only read their own notifications and preferences, while coordinators manage alerts.

---

## 7. Notification Center UI

Located at `/notifications` (`src/app/notifications/page.tsx`):
- Filter by category (`PRICE_CHANGE`, `PRODUCTION_GUIDANCE`, `DISEASE_BIOSECURITY_ADVISORY`, `FOOD_SECURITY_ALERT`, etc.).
- Filter by severity (`INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Toggle unread only.
- Real-time action buttons:
  - **Mark as Read**: Dismisses unread badge.
  - **Acknowledge**: Marks time-sensitive alert as acknowledged by the farmer/trader.
  - **Dismiss**: Soft-deletes the item from user inbox.
  - **Mark All as Read**: Bulk state update.
- Deep action navigation: Direct links to `/marketplace`, `/demand-intelligence`, `/services`, etc.

---

## 8. Verification & Quality Gates

The implementation passed all verification requirements:

1. **Phase 3.16 Unit & Integration Tests**:
   - `src/test/notifications.test.ts`: **30 passed out of 30 tests**.
   - Covers: Schema validation, anti-pork assertions, audience matching, quiet hours windowing, governance gates, human review publishing, deduplication/idempotency, honest delivery statuses, notification lifecycle (read/ack/dismiss), delivery retries, provenance preservation, and backward compatibility.

2. **Full Regression Suite**:
   - Ran `npx vitest run` across all **68 test files**.
   - **1,202 passed tests** with 0 regressions.

3. **TypeScript Quality Gate**:
   - `npm run typecheck` (`tsc --noEmit`): **0 type errors**.

4. **ESLint Quality Gate**:
   - `npm run lint` (`next lint`): **0 errors, 0 warnings**.

5. **Production Build Gate**:
   - `npm run build`: Production bundle succeeded with `/notifications` statically optimized.

---

## 9. Explicit Limitations and Deferred Work

- **External Gateway Provider Integrations**: Live credentials for SMS aggregators (Termii/Twilio), Meta WhatsApp Business Cloud API, and Apple/Firebase Push Notification tokens are deferred to future production infrastructure rollout phases. Until then, external channels faithfully return `UNAVAILABLE` (`PROVIDER_UNAVAILABLE`).
- **Batch Aggregation & Digest Mode**: Periodic digest emails (daily/weekly intelligence digests) are deferred to background cron worker expansion.
