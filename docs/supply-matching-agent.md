# AgroMarket Phase 2.6: Supply Matching & Agricultural Coordination Agent

## 1. Overview & Purpose

The **Supply Matching & Agricultural Coordination Agent** (`SUPPLY_MATCHING_AGENT`, alias `SUPPLY_MATCHING`) is AgroMarket's specialized intelligence engine for coordinating value-chain alignment across Nigerian agricultural producers, institutional buyers, processing facilities, and freight logistics corridors.

The primary objective is to determine:
- Which available or expected agricultural supply can satisfy identified demand;
- How well supply and demand match according to deterministic metrics;
- What constraints exist (processing deficits, transport bottlenecks, corridor security alerts);
- What intermediate processing or multi-farmer aggregation is required;
- What logistics corridor is involved;
- What coordination actions should be recommended for human-in-the-loop review.

### Strict Advisory Boundary & Invariants
The agent is strictly **advisory decision-support infrastructure**.
The system does **NOT**:
1. Autonomously purchase agricultural produce.
2. Autonomously sell or liquidate platform stock.
3. Automatically reserve farmer supply without explicit authorization.
4. Guarantee delivery timelines or physical transport safety.
5. Guarantee road security or safe transit passage.
6. Certify halal status or food hygiene standards.
7. Diagnose crop or animal disease.
8. Automatically execute legally binding contracts.
9. Provide regulated escrow or financial disbursement without human authorization.
10. Synthesize or fabricate missing data or expected yields.

---

## 2. Architecture & Intelligence Stack

The agent builds on AgroMarket's intelligence foundations:

```
Phase 2.1 — Agricultural Intelligence Foundation
        ↓
Phase 2.2 — AI & Agent Reasoning Foundation (AI Gateway)
        ↓
Phase 2.3 — Market Intelligence Agent (Price & Parity)
        ↓
Phase 2.4 — Production Planning Agent (Farm Context & Seasonality)
        ↓
Phase 2.5 — Demand Forecasting & Intelligence Agent (Offtake Signals)
        ↓
Phase 2.6 — Supply Matching & Agricultural Coordination Agent
        ↓
Future Procurement / Food Security / Logistics Intelligence
```

### The 12-Step Lifecycle
```
OBSERVE
   ↓
NORMALIZE
   ↓
MATCH
   ↓
SCORE
   ↓
IDENTIFY GAPS
   ↓
IDENTIFY CONSTRAINTS
   ↓
INTERPRET (AI Gateway)
   ↓
RECOMMEND (Human-in-the-Loop)
   ↓
HUMAN / BUSINESS ACTION
   ↓
OUTCOME
   ↓
EVALUATION
   ↓
IMPROVEMENT
```

---

## 3. Supply Sources & Contextual Dimensions

Agricultural supply is **never** modeled as a naive scalar (`product -> quantity`). The agent observes supply within its physical, agronomic, and geographic context across platform entities:

1. **Active Marketplace Listings** (`listings` + `products`)
2. **Production Outputs** (`production_outputs` from Phase 2.0)
3. **Aggregation Pools** (`aggregation_pools` from Phase 2.0)
4. **Aggregation Contributions** (`aggregation_pool_contributions`)
5. **Processing Facilities** (`processing_facilities`)
6. **Logistics Providers** (`logistics_providers`)
7. **Security Incident Notices** (`agricultural_security_notices` from Phase 1.5)

### Supply Availability Statuses
- `AVAILABLE_NOW`: Immediate ready inventory or harvest.
- `EXPECTED`: Verified farm planting schedule or near-term harvest window.
- `AGGREGATED`: Community aggregation pool in progress.
- `PROCESSING_REQUIRED`: Raw agricultural produce requiring transformation.
- `PROCESSING_AVAILABLE`: Output backed by confirmed processing capacity.
- `UNVERIFIED`: Self-declared or uninspected producer record.
- `INSUFFICIENT_DATA`: Missing key attributes (ready date, weight specifications).

---

## 4. Demand Sources

The agent consumes demand from Phase 2.5 Demand Intelligence:
- Active commercial B2B procurement requests (`b2b_demands`).
- Demand Intelligence Snapshots (`demand_intelligence_snapshots`).
- Consumer sales volume indices and shared purchase pools.
- Unmet demand signals and regional demand differentials.

---

## 5. Unit Normalization

Deterministic unit normalization guarantees physical consistency:
- **Mass units**: `KG`, `TONNES` (1 tonne = 1,000 kg), `50KG BAG` (50 kg), `25KG BAG` (25 kg), `100KG BAG` (100 kg), `GRAMS`.
- **Volume units**: `LITRE`, `25L KEG` (25 litres).
- **Discrete units**: `CRATE`, `CARTON`, `PIECE`, `BUNCH`, `TUBER`.
- **Incompatible conversions**: The system **strictly rejects** converting discrete units to weight (e.g., crate of eggs or tubers to kg) without explicit canonical specifications, returning `INCOMPATIBLE_UNIT` or `INSUFFICIENT_DATA`.

---

## 6. Deterministic Matching & Scoring Formula

The matching engine employs an explainable, 0–100 bounded scoring framework with zero black-box weights:

| Dimension | Max Points | Weight | Criteria |
| :--- | :--- | :--- | :--- |
| **Commodity Compatibility** | 30 pts | 30% | Exact match (30), canonical synonym (28), subcategory (25). Incompatible = 0. Strict anti-pork rejection. |
| **Quantity Compatibility** | 20 pts | 20% | Normalized available supply vs requested demand. Full match = 20; Partial match = prorated `(available / requested) * 20`. |
| **Location Proximity** | 15 pts | 15% | Same LGA (15), Same State (12), Regional Corridor (8), National (3). |
| **Availability Alignment** | 15 pts | 15% | Ready on/before deadline (15), lag ≤ 3 days (8), lag > 3 days (2), unstated date (5). |
| **Specification Fit** | 10 pts | 10% | Quality grade match (10), higher grade offered (9), standard default (8), unspecified (4). |
| **Processing / Aggregation**| 5 pts | 5% | Direct match or processor available (5), processing bottleneck (1). |
| **Logistics / Corridor** | 5 pts | 5% | Carrier available with refrigeration if needed (5); Security alert reported (1). |

### Classifications
- `EXCELLENT_MATCH`: Score ≥ 85
- `GOOD_MATCH`: Score 70–84
- `PARTIAL_MATCH`: Score 45–69
- `LOW_CONFIDENCE_MATCH`: Score 20–44
- `NO_MATCH`: Score < 20
- `INSUFFICIENT_DATA`: Missing critical dimensions

---

## 7. Multi-Source Aggregation & Supply Gap Analysis

### Multi-Farmer Pooling
When individual farm outputs cannot satisfy an institutional demand order alone, the agent applies greedy score-based aggregation:
```
Demand: 5,000 kg Cassava
├── Farmer A: 2,000 kg (Ogun)
├── Farmer B: 1,500 kg (Ogun)
└── Pool C:   1,000 kg (Oyo)
Total Pooled: 4,500 kg (90% Fulfilled)
Remaining Gap: 500 kg Deficit
Coordination Type: MULTI_SOURCE_AGGREGATION
```

### Supply Gap Classification
- `FULLY_SATISFIED`: Fulfillment ≥ 99.9%
- `PARTIALLY_SATISFIED`: Fulfillment > 0% and < 99.9%
- `UNSATISFIED`: Matched volume = 0%
- `INSUFFICIENT_DATA`: Target quantity ≤ 0 or indeterminate

---

## 8. Corridor Logistics & Security Constraints

The agent integrates Phase 1.5 Agricultural Security notices. When a movement corridor intersects active unrest, road closures, or transit friction:
- Sets `logisticsCompatibility` score to 1.
- Attaches constraints: `SECURITY_DISRUPTION_REPORTED` and `CORRIDOR_REVIEW_REQUIRED`.
- Generates an advisory recommendation for manual route verification before dispatch.
- **Never certifies a route as safe.**

---

## 9. Controlled AI Reasoning & Privacy

AI interpretation is managed via the **Phase 2.2 AI Gateway**:
- **Deterministic engine is authoritative**: Quantities, scores, gaps, and constraints are strictly calculated server-side.
- **AI role**: Interprets reasons for weak/strong matches, highlights aggregation bottlenecks, suggests alternative regional corridors, and summarizes risks.
- **Privacy preservation**: Individual buyer contact details, phone numbers, and exact delivery addresses are stripped before packaging evidence.
- **Anti-pork enforcement**: Reject any prompts or outputs mentioning swine/pork.
- **Fallback**: Graceful fallback to deterministic explanations when AI provider is unreachable.

---

## 10. Human-in-the-Loop Recommendation Lifecycle

Coordination recommendations follow an authoritative lifecycle:
```
PROPOSED → REVIEWED → ACCEPTED / REJECTED → ACTIONED → COMPLETED
```
Platform administrators and business account holders retain exclusive authority to transition recommendation states.

---

## 11. Database & Persistence Architecture

1. `supply_matching_snapshots`: Append-only audit record of each match execution with component scores and constraints.
2. `supply_match_candidates`: Candidate suppliers linked to a snapshot.
3. `supply_coordination_recommendations`: Actionable advisory proposals.
4. Protected by immutable triggers (`prevent_supply_matching_snapshot_mutation`) and Row-Level Security (RLS).
