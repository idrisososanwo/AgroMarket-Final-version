# Agricultural Intelligence Feedback Loop & Evaluation Engine (Phase 3.4)

## Overview & Architecture

AgroMarket is a Nigerian-first agricultural coordination and intelligence infrastructure layer connecting:

```
OBSERVE
  ↓
ANALYZE
  ↓
DETECT
  ↓
ORCHESTRATE
  ↓
RECOMMEND
  ↓
DECIDE
  ↓
ACT
  ↓
RECORD OUTCOME
  ↓
EVALUATE EFFECTIVENESS
  ↓
FEED LEARNING SIGNALS BACK INTO INTELLIGENCE
```

Phase 3.4 completes and hardens the closed-loop feedback mechanism, connecting real-world observed outcomes back to intelligence evaluations, learning signals, agent performance tracking, and upstream data quality auditing.

---

## 1. Controlled Outcome Taxonomy

AgroMarket employs an extensible, governed outcome taxonomy rather than arbitrary client-authored strings:

- **Supply Outcomes**: `SUPPLY_SOURCED`, `SUPPLY_PARTIALLY_SOURCED`, `SUPPLY_NOT_SOURCED`
- **Procurement Outcomes**: `PROCUREMENT_COMPLETED`, `PROCUREMENT_PARTIALLY_COMPLETED`, `PROCUREMENT_FAILED`
- **Marketplace Outcomes**: `MARKETPLACE_PURCHASE_COMPLETED`, `MARKETPLACE_PURCHASE_CANCELLED`
- **Production Outcomes**: `PRODUCTION_PLAN_ACCEPTED`, `PRODUCTION_PLAN_DEFERRED`, `PRODUCTION_PLAN_COMPLETED`
- **Logistics Outcomes**: `LOGISTICS_MOVEMENT_COMPLETED`, `LOGISTICS_DELAYED`, `LOGISTICS_CANCELLED`
- **Equipment & Services**: `EQUIPMENT_RENTAL_COMPLETED`, `SERVICE_REQUEST_COMPLETED`
- **Shared Purchases**: `SHARED_PURCHASE_COMPLETED`, `SHARED_PURCHASE_CANCELLED`
- **Food Security**: `FOOD_SECURITY_RESPONSE_COMPLETED`, `FOOD_SECURITY_RESPONSE_DEFERRED`
- **Intelligence Validation**: `INTELLIGENCE_CONFIRMED`, `INTELLIGENCE_DISMISSED`, `INTELLIGENCE_UNCONFIRMED`
- **Fallback**: `OTHER`

### Critical Invariant: No Conflation of UI Action with Real-World Outcome
A completed UI click or deep-link navigation is **never** inferred as a successful agricultural outcome. An agricultural outcome requires ground-truth verification (e.g. delivery waybill, weighbridge scale ticket, or formal partner confirmation).

---

## 2. Evidence Provenance Model

Outcomes are backed by append-only evidence records in `agricultural_outcome_evidence`:

- **Provenance Nature**:
  - `OBSERVED`: Direct ground-truth observation (e.g. physical receipt, scale reading)
  - `DERIVED`: Computed deterministically from authoritative ledger transactions
  - `CORRELATED`: Statistically correlated field signals
  - `ESTIMATED`: Model estimation / proxy measurement
  - `UNKNOWN`: Insufficient provenance details
- **Evidence Types**: `TRANSACTION_RECEIPT`, `DELIVERY_WAYBILL`, `HARVEST_INSPECTION`, `QUALITY_GRADING`, `PARTNER_CONFIRMATION`, `GROUND_TRUTH_OBSERVATION`, `USER_ATTESTATION`, `CORRIDOR_SURVEILLANCE`, `MARKET_SURVEY`, `SYSTEM_EVENT_AUDIT`.
- **Source Types**: `SYSTEM_EVENT`, `VERIFIED_TRANSACTION`, `USER_REPORT`, `EXTERNAL_SOURCE`, `AGENT_OBSERVATION`.
- **Immutability Trigger**: `fn_prevent_outcome_evidence_update()` enforces strict append-only immutability.

---

## 3. Deterministic Evaluation Engine

The evaluation engine compares predictions/recommendations against observed ground truth:

1. **Prediction vs. Outcome**:
   - Compares predicted values against actual observed values.
   - Computes absolute error, percentage error, direction accuracy, and range compliance.
2. **Timeliness Evaluation**:
   - `EARLY`: Outcome observed ahead of expected window.
   - `ON_TIME`: Outcome observed within tolerance window (default: ±48 hours).
   - `LATE`: Outcome observed after expected window.
   - `EXPIRED`: Target window elapsed with no outcome observed.
   - `NOT_EVALUABLE`: Missing or unparseable timestamps.
3. **Usefulness Assessment**:
   - `VERY_USEFUL` / `USEFUL`: Accepted recommendation that led to completed real-world outcome.
   - `NEUTRAL`: Deferred, saved, or partially resolved recommendations.
   - `NOT_USEFUL`: Rejected recommendations or actions resulting in negative variance.
4. **Insufficient Data Protection**:
   - If evidence count < 1 or values are missing, returns `INSUFFICIENT_DATA`. Never fabricates predictive accuracy.

---

## 4. Structured Learning Signals

Completed evaluations derive structured learning signals stored in `agricultural_learning_signals`:

- `RECOMMENDATION_SUCCESS_RATE`: Empirical conversion to positive outcome.
- `FALSE_POSITIVE_SIGNAL`: Alert issued but refuted by field observations.
- `FALSE_NEGATIVE_SIGNAL`: Disruption occurred without prior signal.
- `PREDICTION_ERROR` / `DEMAND_FORECAST_ERROR` / `LOGISTICS_PREDICTION_ERROR`: Numerical discrepancy tracking.
- `CONFIDENCE_CALIBRATION_SIGNAL`: Difference between stated agent confidence and verified accuracy (detecting overconfidence or underconfidence).
- `SUPPLY_MATCH_EFFECTIVENESS` / `PROCUREMENT_MATCH_EFFECTIVENESS`: Efficiency of value-chain matching.

**Rule**: Learning signals are analytical evidence artifacts. They do **not** automatically rewrite production weights, parameters, or models without human authorization.

---

## 5. Unified Agent Performance Tracking

Covers all 9 canonical agents:
1. `MARKET_INTELLIGENCE_AGENT`
2. `PRODUCTION_PLANNING_AGENT`
3. `DEMAND_FORECASTING_AGENT`
4. `SUPPLY_MATCHING_AGENT`
5. `PROCUREMENT_INTELLIGENCE_AGENT`
6. `FOOD_SECURITY_RESILIENCE_AGENT`
7. `LOGISTICS_INTELLIGENCE_AGENT`
8. `AGRICULTURAL_DISEASE_BIOSECURITY_AGENT`
9. `AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR`

### 8 Core Evaluation Questions Answered:
1. Which agent produced this recommendation?
2. What evidence did it use?
3. What confidence did it have?
4. What decision resulted?
5. What action resulted?
6. What outcome occurred?
7. Was the recommendation useful?
8. Was the prediction correct?

If an agent has fewer than `MIN_EVALUATIONS_THRESHOLD` (3) completed evaluations, `evaluationState` is explicitly set to `INSUFFICIENT_DATA`, and scores remain null.

---

## 6. Upstream Data Quality Auditing

Identifies flaws in upstream telemetry without silently dropping records:
- `STALE_OBSERVATION`: Observation > 72 hours old.
- `MISSING_SOURCE_PROVENANCE`: Missing source identifier or external references.
- `INCONSISTENT_UNITS`: Numeric values without standardized measurement units.
- `DUPLICATE_OBSERVATIONS`: Repeated identical observations.
- `SUSPICIOUS_VALUES`: Negative prices, negative harvest volumes, or impossible extremes.
- `INSUFFICIENT_INDEPENDENT_SOURCES`: Single unverified source with low confidence.

---

## 7. Safety, Privacy & Governance Boundaries

- **Anti-Pork Policy**: Strict zero-tolerance regex check across all commodities, descriptions, and notes (`pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine`).
- **Commercial Privacy**: Zero storage of raw GPS coordinates, private phone numbers, or confidential B2B pricing terms.
- **Agricultural Security**: Advisory corridor review only. Never provides tactical security guidance or safe-passage guarantees.
- **Disease & Biosecurity**: Advisory indicator only. Never prescribes veterinary treatments, chemicals, or clinical diagnoses.
- **AI Boundary**: AI is strictly advisory decision support and explanation. All calculations and state transitions are deterministic.
- **Server Authorization**: Identity is derived exclusively from authenticated server session (`auth.uid()`).
