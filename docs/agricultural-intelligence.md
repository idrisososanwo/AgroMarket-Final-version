# AgroMarket Phase 2.1: Agricultural Intelligence Foundation

> **Architectural Lineage Note:**
> Kaggriculture is a conceptual predecessor and research lineage, **not** a runtime dependency or imported codebase. AgroMarket adapts the foundational loop `OBSERVE → DECIDE → ACT → EVALUATE → IMPROVE` into a Nigerian-first, asset-light, multi-actor coordination ecosystem.

---

## 1. Why AgroMarket Has an Intelligence Layer
AgroMarket is not merely a listing directory or classifieds board. Nigerian agriculture is deeply fragmented:
- Farm gate yields face high post-harvest perishability.
- Wholesale terminal markets suffer from sudden price volatility and supply deficits.
- Processing facilities (abattoirs, cold rooms, grain mills) operate with unpredictable throughput and queue congestion.
- Transit freight routes encounter interstate security disruptions, bad roads, and fuel price swings.

The Agricultural Intelligence layer acts as an ecosystem brain that connects disjointed participants, computes deterministic signals, coordinates multi-actor responses, and maintains an auditable memory of predictions versus real outcomes.

---

## 2. How It Differs from Kaggriculture
| Dimension | Kaggriculture (Research / Predecessor) | AgroMarket Phase 2.1 (Production Foundation) |
|---|---|---|
| **Context** | Generic global/academic agricultural simulations | Grounded strictly in Nigerian agricultural value chains, corridors, and states |
| **Data Reliance** | Simulated benchmark datasets | Live transactional orders, real price observations, B2B demand, verified security notices |
| **Execution** | Automated simulation loops | Human-in-the-loop advisory recommendations (no unreviewed actions) |
| **Anti-Pork Policy** | Agnostic | Zero-tolerance strict database and schema prohibition |
| **Asset Strategy** | Theoretical infrastructure | Asset-light coordination layer (AgroMarket owns NO physical farms, cold rooms, or fleets) |
| **Payment Rail** | Agnostic / Generic | Nigerian Naira (NGN) primary rail |

---

## 3. Intelligence Architecture
The operational flow is strictly hierarchical and deterministic:

```
                  RAW DOMAIN DATA
   (Market, Supply, Demand, Processing, Logistics, Security)
                         ↓
             DETERMINISTIC SIGNAL ENGINE
       (Mathematical Thresholds & Corridor Rules)
                         ↓
               INTELLIGENCE SIGNALS
        (Quantified Magnitude + Evidence References)
                         ↓
               CONFIDENCE SCORING
     (Source Reliability, Recency, Sample Count, Agreement)
                         ↓
             ADVISORY RECOMMENDATIONS
         (Proposed State Machine Action)
                         ↓
                HUMAN REVIEW GATE
            (Approved / Rejected / Notes)
                         ↓
                 REAL-WORLD OUTCOME
             (Observed Market Reaction)
                         ↓
               DETERMINISTIC EVALUATION
          (Error, Directional Accuracy, Score)
                         ↓
                  AGENT MEMORY
```

---

## 4. Data Sources
The intelligence layer does not duplicate data into giant monolithic tables. It queries existing production domains via typed read models:
1. **Market Domain**: `price_observations` (normalized prices, regional averages, baseline comparisons).
2. **Supply Domain**: `production_outputs`, `aggregation_pools` (unallocated volumes, harvest pool stages).
3. **Demand Domain**: `orders`, `b2b_demands`, `shared_purchases` (commercial volume requests, consumer basket frequency).
4. **Processing Domain**: `processing_facilities`, `processing_events` (operational capacity, queue backlogs).
5. **Logistics Domain**: `deliveries`, `delivery_events` (transit corridor status, exception delay rates).
6. **Security Domain**: `agricultural_security_incidents` (verified physical security events, affected states, movement impacts).
7. **Knowledge Domain**: `knowledge_articles`, extension bulletins.
8. **Equipment Domain**: `equipment`, `equipment_rentals`.
9. **Value Chain Domain**: `value_chain_events` (append-only ledger of production transformations).

---

## 5. Signal Types
Standardized signals supported in Phase 2.1:
- `PRICE_INCREASE`: Normalized regional price rose above threshold (e.g. +10%).
- `PRICE_DECREASE`: Normalized regional price dropped below threshold (e.g. -10%).
- `DEMAND_INCREASE`: Offtake demand volume shifted materially above 30-day baseline.
- `DEMAND_DECREASE`: Offtake demand volume dropped materially below baseline.
- `SUPPLY_SHORTAGE`: Available harvest output covers less than 70% of regional demand.
- `SUPPLY_SURPLUS`: Available harvest output exceeds demand by >35%.
- `PROCESSING_BOTTLENECK`: Queued volume exceeds facility capacity with backlog >2 days.
- `LOGISTICS_DISRUPTION`: Corridor delivery delay exception rate exceeds 20%.
- `SECURITY_DISRUPTION`: Published, verified security incident impacts agricultural transit/farm gate.
- `DISEASE_RISK`: Official or extension alert regarding pest/pathogen risk in commodity area.
- `SEASONAL_DEMAND`: Known festive or cyclical demand peak for Nigerian staple commodities.

---

## 6. Deterministic Engine
The engine executes pure mathematical functions:
- Independent of LLMs or stochastic neural outputs.
- Testable with zero external mocking required.
- Implements versioned rulesets (`DETERMINISTIC_ENGINE_VERSION = "2.1.0"`).
- Explains every signal with structured references back to source records.

---

## 7. Confidence Model
Confidence is derived purely from evidence quality rather than subjective probabilistic estimations:
- **Source Reliability**: Platform transactions = 1.0, official monitors = 0.9, verified survey = 0.85, self-reported = 0.4.
- **Sample Size**: Logarithmic scaling: 1 sample = 0.60 weight, 3+ samples = 0.75, 7+ = 0.90, 15+ = 1.0.
- **Recency Decay**: Linear decay curve over 35 days, bounded at minimum 0.15.
- **Consistency**: Standard deviation to mean ratio penalty if multi-source data diverges.
- **Geographic Precision**: EXACT_LGA (1.0) vs SAME_STATE (0.92) vs CORRIDOR (0.85) vs NATIONAL (0.7).
- Score is deterministically bounded in `[0.05, 0.99]`.

---

## 8. Evidence Model
Every observation, signal, and recommendation contains structured evidence references:
```json
{
  "sourceType": "PRICE_OBSERVATION",
  "sourceId": "price-obs-broiler-lagos",
  "description": "Normalized price moved from ₦4,000 to ₦4,800 (+20.0%) in Lagos.",
  "observedAt": "2026-10-05T12:00:00Z",
  "relevance": 1.0,
  "metadata": { "baselinePrice": 4000, "recentPrice": 4800, "diff": 20 }
}
```

---

## 9. Recommendations
Recommendations are purely **advisory**:
- Created with initial status `PROPOSED`.
- Categorized by actionable objective: `STABILIZE_SUPPLY`, `PREVENT_SPOILAGE`, `OPTIMIZE_PRICING`, `REROUTE_LOGISTICS`, `RISK_MITIGATION`, `FACILITY_OFFTAKE`, `DEMAND_FULFILLMENT`, `SECURITY_ADVISORY`.
- Specifies expected impact timeframe and quantitative indicators.

---

## 10. Human-in-the-Loop
No recommendation is autonomously executed:
- Status transition: `PROPOSED` → `REVIEWED` → `APPROVED` / `REJECTED` → `EXECUTED` / `EXPIRED`.
- Requires authenticated user credentials.
- Records `reviewed_by`, `reviewed_at`, `review_decision`, and `review_notes`.
- Database RLS prevents unauthorized mutation of review decisions.

---

## 11. Agent Registry
Pre-registers the multi-agent foundation in `agricultural_intelligence_agents`:
1. `AGRICULTURAL_INTELLIGENCE` (Core Phase 2.1 Engine)
2. `MARKET_INTELLIGENCE` (Price & parity monitoring)
3. `PRODUCTION_PLANNING` (Farm planting & harvest pacing)
4. `DEMAND_FORECASTING` (Institutional offtake curves)
5. `SUPPLY_MATCHING` (Multi-actor batch coordination)
6. `FOOD_SECURITY` (Vulnerability & staple deficit indexing)
7. `SECURITY_RISK` (Corridor risk correlation)
8. `DISEASE_RISK` (Pest & biosecurity advisory tracking)
9. `LOGISTICS_INTELLIGENCE` (Freight delay & reefer monitoring)
10. `FARMER_ADVISORY` (Localized smallholder extension guidance)
11. `PROCUREMENT` (Commercial bulk offtake structuring)

---

## 12. Memory / Evaluation
Maintains a verifiable record of predictive accuracy:
1. `agricultural_intelligence_predictions`: Stores baseline value, predicted value, range, confidence, and target date.
2. `agricultural_intelligence_outcomes`: Records actual real-world values observed after target date.
3. `agricultural_intelligence_evaluations`: Evaluates absolute error, percentage error (MAPE), directional accuracy (did it trend up/down as predicted?), range compliance, and overall score `[0.0, 1.0]`.

---

## 13. Safety Boundaries
The intelligence system MUST NOT autonomously:
- Disburse or transfer funds.
- Book or dispatch livestock transport.
- Certify Halal status or regulatory compliance.
- Issue veterinary diagnoses on individual animals.
- Guarantee physical safety on transit routes.
- Override human administrative decisions.

---

## 14. Anti-Pork Architecture
Strict enforcement against pig/pork/swine/porcine commodities exists across every architectural layer:
- **Database CHECK constraints**: `\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y` on observations, signals, recommendations, and predictions.
- **Zod Schema Validation**: `containsProhibitedProduce()` validation on all incoming DTOs.
- **Engine Rules**: Complete prohibition in seasonality tables and signal generators.

---

## 15. Privacy
- Strips exact street addresses, GPS farm coordinates, and private phone numbers.
- Geographically aggregates outputs to Nigerian State, LGA, and national freight corridors.

---

## 16. Security Intelligence
- Ingests verified, published security notices from the Phase 1.5 agricultural security domain.
- Emits `SECURITY_DISRUPTION` signals when high-severity incidents impact staple transport routes.
- Security notices remain strictly advisory without claiming physical safety guarantees.

---

## 17. Disease-Risk Boundaries
- **No Veterinary Diagnosis**: The system never asserts "This animal has disease X."
- **Advisory Phrasing Only**: "Reported disease risk affecting [Commodity] in [State]."
- Encourages consultation with certified veterinary officers and local extension workers.

---

## 18. Future Specialized Agents
The 10 specialized agent roles listed in Section 11 are pre-registered in the registry schema. They will consume the shared data access layer, confidence calculator, and evaluation ledger established in Phase 2.1.

---

## 19. Future ML / AI Integration
In future phases, LLMs and neural models will be introduced to generate narrative explanations and synthesize qualitative nuances. However, they will:
- Reason over structured deterministic signals and evidence records.
- Never directly alter raw database balances or execute financial commitments.
- Always operate under the established human-in-the-loop review state machine.

---

## 20. What Is Intentionally Deferred
Phase 2.1 intentionally defers:
1. Autonomous transactional execution.
2. Individual livestock GPS movement tracking.
3. Deep neural network forecasting models.
4. Autonomous LLM chat agents.
5. IoT cold-chain temperature telemetry streaming.
6. Public consumer recommendation feeds (Phase 2.1 is the admin/foundation layer).
