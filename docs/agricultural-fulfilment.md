# Agricultural Commitment Fulfilment, Reconciliation & Reliability Architecture

**Phase**: 3.11  
**Status**: Production Ready  
**Scope**: Operational Supply Commitment Fulfilment, Mathematical Quantity Reconciliation, Provenance-Aware Evidence, and Advisory Reliability Foundations.

---

## 1. Executive Overview

Phase 3.10 established the foundation for multi-party agricultural coordination and supply commitments (`agricultural_supply_commitments`). In Phase 3.11, those commitments become operationally measurable across their real-world execution lifecycle without sacrificing architectural boundaries or blurring the distinction between intentions and physical reality.

### Core Principle
> **A supply commitment is a declared intention/obligation within AgroMarket coordination.**  
> It is **NOT** automatically inventory, payment, ownership transfer, physical delivery, verified production, quality certification, or halal certification.

Phase 3.11 models the operational progression:
$$\text{COMMITMENT} \longrightarrow \text{CONFIRMATION} \longrightarrow \text{FULFILMENT READINESS} \longrightarrow \text{PROCESSING / AGGREGATION / LOGISTICS} \longrightarrow \text{DELIVERY EVIDENCE} \longrightarrow \text{QUANTITY RECONCILIATION} \longrightarrow \text{COMPLETION OR EXCEPTION} \longrightarrow \text{OUTCOME} \longrightarrow \text{INTELLIGENCE FEEDBACK}$$

---

## 2. Fulfilment Readiness Lifecycle

Commitment readiness follows a deterministic, unidirectional state machine implemented in `src/features/agricultural-coordination/state-machine.ts`:

```
NOT_READY
  │
  ├──> READY_FOR_AGGREGATION ──┐
  ├──> READY_FOR_PROCESSING  ──┼──> IN_FULFILMENT <──> PARTIALLY_FULFILLED
  └──> READY_FOR_LOGISTICS   ──┘          │
                                          ├──> FULFILLED (Terminal)
                                          └──> FAILED (Terminal)
[Any non-terminal] ──> CANCELLED (Terminal)
```

### Readiness States
1. `NOT_READY`: Initial baseline upon commitment acceptance; producer is preparing crop/livestock.
2. `READY_FOR_AGGREGATION`: Produce is harvested and staged for aggregation pool collection.
3. `READY_FOR_PROCESSING`: Raw produce is ready for processing facility handoff.
4. `READY_FOR_LOGISTICS`: Consignment is packaged, graded, and staged for carrier handoff.
5. `IN_FULFILMENT`: Active transit, processing, or physical distribution in progress.
6. `PARTIALLY_FULFILLED`: One or more partial delivery increments received, balance remaining.
7. `FULFILLED`: All committed quantity delivered and mathematically reconciled.
8. `FAILED`: Terminal operational failure recorded with structured failure reason.
9. `CANCELLED`: Mutual or authorized administrative withdrawal.

---

## 3. Evidence Model & Provenance Taxonomy

Evidence submitted to substantiate commitment readiness or delivery is recorded in `agricultural_commitment_evidence` and tracked with strict provenance classification:

### Provenance Hierarchy
- `TRANSACTION_OBSERVED`: Automatically confirmed by linked digital transactions (e.g., electronic weighbridge scale, verified carrier scan).
- `AUTHORIZED_REVIEW`: Signed off by a designated coordinator, warehouse manager, or inspection officer.
- `EXTERNAL_SOURCE`: Integrated third-party telematics or partner ERP record.
- `SYSTEM_DERIVED`: Derived by orchestration algorithms comparing multiple data points.
- `SELF_REPORTED`: Unilateral claim submitted by farmer or buyer (carries lowest evidential weight; never treated as physical proof).

### Evidence Categories
- `PRODUCER_CONFIRMATION`: Farmer verifies readiness date and harvest quantity.
- `QUANTITY_CONFIRMATION`: Weighbridge or tally sheet record.
- `AVAILABILITY_CONFIRMATION`: Physical inspection confirms crops ready for harvest.
- `AGGREGATION_CONFIRMATION`: Aggregation hub intake acknowledgement.
- `PROCESSING_CONFIRMATION`: Processing plant intake / conversion record.
- `LOGISTICS_HANDOFF`: Carrier bill of lading or pickup manifest.
- `DELIVERY_CONFIRMATION`: Consignee receiving stamp / delivery receipt.

---

## 4. Quantity Reconciliation Mathematics

Quantity reconciliation enforces strict mathematical accounting between the original commitment and physical delivery:

$$\text{Variance Quantity} = \text{Fulfilled Quantity} - \text{Committed Quantity}$$
$$\text{Variance Percentage} = \left(\frac{\text{Variance Quantity}}{\text{Committed Quantity}}\right) \times 100$$
$$\text{Remaining Quantity} = \max\left(0, \text{Committed Quantity} - \text{Fulfilled Quantity}\right)$$

### Reconciliation Outcomes
- `EXACT`: Fulfilled quantity matches committed quantity exactly ($\Delta = 0$).
- `UNDER_FULFILLED`: Fulfilled quantity is less than committed quantity ($\Delta < 0$).
- `OVER_FULFILLED_BLOCKED`: Fulfilled quantity exceeds commitment ($\Delta > 0$). **Database and server actions block over-fulfilment** to protect against coordination imbalances.
- `NO_FULFILMENT`: Fulfilled quantity is zero upon terminal closure.
- `INSUFFICIENT_DATA`: Missing canonical unit conversion or unverified records.

### Unit Safety
All comparisons are normalized to canonical kilogram equivalents (`canonicalQuantityKg`) via Phase 2.6 unit conversion routines. If conversion metadata is missing, the reconciliation fails closed with `INSUFFICIENT_DATA`.

---

## 5. Partial Fulfilment & Shortfall Accounting

### Non-Destructive Accounting
Under partial fulfilment (e.g., 1,500 kg delivered of 2,000 kg committed):
- Original `committed_quantity` (2,000 kg) remains **immutable**.
- `fulfilled_quantity` is recorded as 1,500 kg.
- `remaining_quantity` is updated to 500 kg.
- Commitment status becomes `FULFILMENT_PENDING` while readiness status transitions to `PARTIALLY_FULFILLED`.

### Coordination Shortfall Accounting
At the opportunity level, the aggregate shortfall is calculated deterministically:
$$\text{Shortfall} = \max\left(0, \text{Target Quantity} - \sum \text{Fulfilled Quantities}\right)$$

Shortfall visibility is surfaced to coordinators and participants via `FulfilmentReconciliationPanel`. The system **does not automatically purchase replacement supply** or reassign suppliers, generating instead an advisory action for administrative review.

---

## 6. Failure Reasons & Dispute Integration

### Structured Failure Taxonomy
To prevent arbitrary free-text states, failure reasons must adhere to the domain enum:
- `SUPPLY_UNAVAILABLE`: Crop loss, pest outbreak, or pre-harvest failure.
- `QUANTITY_SHORTFALL`: Yield fell below committed volume.
- `TIMING_FAILURE`: Produce matured too early or late for coordinated processing.
- `PROCESSING_CONSTRAINT`: Mill or processing facility capacity unavailable.
- `LOGISTICS_CONSTRAINT`: Road impassable, vehicle breakdown, or fuel scarcity.
- `SECURITY_DISRUPTION`: Advisory conflict or civil unrest preventing transit.
- `QUALITY_REQUIREMENT_UNMET`: Moisture content, aflatoxin, or grading rejection.
- `PARTICIPANT_WITHDRAWAL`: Farmer or buyer unilateral withdrawal.
- `EXPIRED_COMMITMENT`: Expiry date elapsed without readiness confirmation.
- `INSUFFICIENT_EVIDENCE`: Failure to provide required provenance documentation.
- `OTHER`: Exceptional edge cases (requires mandatory explanation).

### Dispute Integration
Unresolved variances link directly to Phase 0.8 dispute mechanisms via `dispute_id`. The original commitment, evidence timeline, and reconciliation records remain immutable to provide an unalterable audit trail.

---

## 7. Participant Reliability Metrics & Anti-Penalty Invariant

Participant reliability is computed deterministically in `src/features/agricultural-coordination/calculations.ts`:

### Minimum Sample Threshold
To prevent punitive bias against smallholder farmers:
- If a participant has completed **fewer than 3 commitments**, `reliabilityStatus` is set to `INSUFFICIENT_DATA`.
- `fulfilmentRate`, `onTimeFulfilmentRate`, and `averageQuantityVariance` return `null`.
- **No automated penalties, price reductions, account suspensions, or visibility demotions are ever applied.**

### Computable Metrics (Sample $\ge 3$)
- $\text{Fulfilment Rate} = \frac{\text{Fulfilled Commitments}}{\text{Total Commitments}} \times 100$
- $\text{On-Time Rate} = \frac{\text{Fulfilled On-Time}}{\text{Total Fulfilled}} \times 100$
- $\text{Average Quantity Variance} = \frac{\sum \text{Variance Percentages}}{N}$
- $\text{Partial Fulfilment Rate} = \frac{\text{Partially Fulfilled}}{\text{Total Commitments}} \times 100$

All metrics are advisory and intended for matchmaking optimization, not automated punitive action.

---

## 8. Governance, Privacy & Security Boundaries

### Phase 3.8 Governance Integration
All consequential state mutations (recording fulfilment, declaring failure, overriding reconciliation) invoke `evaluateGovernancePolicy`. If a policy returns `DENY` or requires unfulfilled `HUMAN_APPROVAL`, the server action fails closed.

### Anti-Pork Zero-Tolerance Invariant
Enforced across database constraints (`chk_evidence_anti_pork`), Zod validation schemas (`assertNoProhibitedProduceCoordination`), server actions, and evidence notes. Any reference to porcine produce fails closed immediately.

### Privacy & Information Masking
Peers in an aggregation pool or coordination opportunity cannot inspect competitors' private data:
- Private notes are stripped (`null`).
- User IDs and author IDs are hashed (`masked-xxxx`).
- Carrier phone numbers and warehouse access codes are scrubbed.
- Aggregate physical quantities and grades remain visible for transparency.

### Security & Disease Boundaries
- **Security Disruption**: Surface advisory alerts only. Never promise "safe passage", never autonomously reroute convoys, never dispatch security personnel.
- **Disease & Biosecurity**: Surface biosecurity signals as supply disruption context. Never provide veterinary diagnoses, never order culls or quarantines, and never override statutory agricultural authorities.

---

## 9. Database & Concurrency Protections

### Migration Applied
`supabase/migrations/20261008150000_phase_3_11_agricultural_fulfilment_reconciliation.sql`
- Extended `agricultural_supply_commitments` with readiness, reconciliation, and audit columns.
- Created `agricultural_commitment_evidence` table with UUID PK, check constraints, and RLS policies using `public.is_admin()`.
- Added atomic PostgreSQL function `atomic_record_commitment_fulfilment(p_commitment_id, p_increment, p_recorded_by, ...)` featuring `SELECT ... FOR UPDATE` row locks to prevent simultaneous double-fulfilment and race conditions.

---

## 10. Known Limitations & Deferred Features

1. **Automated Telematics Ingestion**: Direct IoT weighbridge and GPS hardware APIs are deferred; evidence currently accepts manual entry and transaction IDs.
2. **Financial Escrow Integration**: No automated fund disbursements or penalty deductions occur on fulfilment; financial settlement remains decoupled.
3. **Multi-Leg Logistics Handoffs**: While `LOGISTICS_HANDOFF` evidence is captured, multi-hop intermodal carrier transfers will be expanded in future logistics releases.
