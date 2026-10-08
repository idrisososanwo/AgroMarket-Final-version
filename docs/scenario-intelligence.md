# AgroMarket Scenario Intelligence & Forward Planning Layer (Phase 3.7)

> **ARCHITECTURAL BOUNDARY & SAFETY INVARIANTS**:
> - **ADVISORY ONLY**: Scenario intelligence models plausible future states and planning implications for **human decision-makers**.
> - **NO AUTONOMOUS TRANSACTIONS**: Never executes purchases, sales, inventory releases, shipments, quarantines, or veterinary culling.
> - **ASSET-LIGHT ARCHITECTURE**: Coordinates third-party ecosystem actors; does not own physical farms, cold rooms, processing plants, or transport fleets.
> - **ZERO-TOLERANCE ANTI-PORK**: Pig and pork commodities are strictly prohibited across all database tables, models, queries, evidence, and prompts.
> - **SECURITY & BIOSECURITY BOUNDARIES**: Mandatory disclaimers (`CORRIDOR_REVIEW_REQUIRED`, non-diagnostic veterinary disclaimers, coordinator review for food security).
> - **PRIVACY SAFEGUARDS**: Aggregated at National, Regional Corridor, State, or safe LGA levels. No raw GPS coordinates, phone numbers, or private PII.
> - **BACKEND ONLY**: No consumer chatbot, conversational agent, or frontend UI components.

---

## 1. Purpose & Pipeline Alignment

Phase 3.7 advances AgroMarket's end-to-end intelligence pipeline:

```mermaid
flowchart LR
    A[Historical Memory\nPhase 3.5] --> B[Current Conditions\nPhase 2.1-3.1]
    B --> C[Multi-Horizon Forecasts\nPhase 3.6]
    C --> D[Cross-Horizon Scenario Modeling\nPhase 3.7]
    D --> E[Forward Planning Implications\nPhase 3.7]
    E --> F[Human Decision & Action\nPhase 3.2-3.3]
    F --> G[Observed Outcome\nPhase 3.4]
    G --> H[Evaluation & Learning Loop\nPhase 3.4]
```

Where Phase 3.6 projected individual metrics across time horizons, Phase 3.7 answers:
> *"Given the current agricultural state and multi-horizon forecasts, what plausible future scenarios could emerge, what dependencies drive them, and what forward planning actions should AgroMarket surface to human coordinators and ecosystem actors?"*

---

## 2. Canonical Scenario Types (12 Types)

The engine deterministically matches evidence against 12 controlled scenario types:

1. **`BALANCED_NOMINAL_SCENARIO`**: Current indicators continue broadly within historical statistical baseline bands.
2. **`DEMAND_SURGE_SCENARIO`**: Buyer order velocity and commercial search interest rise faster than current supply availability.
3. **`SUPPLY_SHORTAGE_SCENARIO`**: Supply volumes contract relative to baseline and expected off-take.
4. **`SUPPLY_SURPLUS_SCENARIO`**: Harvest volume inflow exceeds localized absorption capacity, risking price collapse or spoilage.
5. **`MARKET_PRESSURE_SCENARIO`**: Acute wholesale price volatility or spatial spread widening.
6. **`LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO`**: Supply exists at source/farm gate, but freight haulage delays or corridor constraints limit terminal delivery.
7. **`PROCESSING_BOTTLENECK_SCENARIO`**: Agricultural output increases faster than regional drying, milling, or cold-storage capacity.
8. **`DISEASE_SUPPLY_RISK_SCENARIO`**: Agricultural biosecurity risk indicators create potential localized supply exposure.
9. **`PROCUREMENT_RISK_SCENARIO`**: B2B off-taker requirements face fulfillment deficits or concentrated supplier default risks.
10. **`FOOD_SECURITY_PRESSURE_SCENARIO`**: Multiple domains converge on regional supply-gap or household staple affordability pressure.
11. **`RESILIENCE_STRESS_SCENARIO`**: Network exhibits dangerous dependency on single transit corridors or concentrated supplier clusters.
12. **`MULTI_DOMAIN_RISK_SCENARIO`**: Concurrency of 3 or more independent risk domains (e.g., transit delay + biosecurity alert + supply deficit).

---

## 3. Cross-Horizon Reasoning

The cross-horizon synthesizer evaluates how directional trends behave across Phase 3.6 horizons:
- **Short-Term (0–7 Days)**: Immediate tactical spot dynamics and dispatch readiness.
- **Medium-Term (8–30 Days)**: Monthly aggregation cycles and B2B order schedules.
- **Long-Term (31–90 Days)**: Seasonal harvest shifts, regional planting outlook, and buffer reserves.

### Trajectory Classification:
- **`STRUCTURAL_DEFICIT`**: Persistent supply contraction or price escalation across short, medium, and long horizons.
- **`TRANSIENT_SPIKE`**: Short-term disruption (e.g., flash flood road closure) while medium-term baseline remains stable.
- **`ACCELERATING_SURPLUS`**: Growth in current arrivals compounding into medium-term harvest glut.
- **`COUNTER_CYCLICAL_DIVERGENCE`**: Short-term trend contradicts medium/long-term outlook, triggering an explicit horizon conflict.
- **`NOMINAL_STABILITY`**: All horizons remain within historical standard deviations ($Z$-score $< 1.0$).

---

## 4. Cross-Domain Conflict Detection

Contradictory signals across independent intelligence domains are never silently discarded. They are formalized as conflict records:

| Conflict Type | Description | Confidence Penalty |
|---|---|---|
| `DEMAND_SUPPLY_CONFLICT` | Demand surging while supply reported abundant/surplus | -0.25 |
| `MARKET_SUPPLY_CONFLICT` | Wholesale prices crashing despite acute supply shortage | -0.25 |
| `PRODUCTION_DEMAND_CONFLICT` | Planting expansion in zone where demand is contracting | -0.20 |
| `LOGISTICS_SUPPLY_CONFLICT` | Harvest ready at farm gate but corridor freight is blocked | -0.15 |
| `DISEASE_PRODUCTION_CONFLICT` | Biosecurity alert in area of projected production expansion | -0.30 |
| `PROCUREMENT_DEMAND_CONFLICT` | B2B orders unfulfilled while broader demand contracts | -0.20 |
| `FORECAST_HORIZON_CONFLICT` | Short-term forecast directly opposes medium-term baseline | -0.20 |

Net confidence formula:
$$\text{Net Confidence} = \max\left(0.10, \text{Raw Confidence} - \sum \text{Confidence Penalties}\right)$$

---

## 5. Confidence & Probability Methodology

### Probability Classes:
- **`HIGH_CONCERN`**: Multi-domain convergence ($\ge 3$ risk domains), net confidence $\ge 0.70$.
- **`ELEVATED`**: Supported by 2+ independent domains, net confidence $\ge 0.50$.
- **`PLAUSIBLE`**: Supported by 1 domain with valid forecast or baseline, net confidence $0.30 - 0.49$.
- **`LOW_LIKELIHOOD`**: Nominal/balanced conditions with low likelihood of disruption.
- **`INSUFFICIENT_DATA`**: Data sparsity or quality failure.

### Insufficient-Data Governance:
If valid supporting evidence items are fewer than 2 ($N < 2$), the engine strictly outputs:
- Status: `DRAFT`
- Probability Class: `INSUFFICIENT_DATA`
- Confidence Score: `0.0`
- Confidence Level: `INSUFFICIENT_DATA`
- Never fabricates probability percentages or artificial scenarios.

---

## 6. Forward Planning Implications

Planning implications advise human actors across controlled action categories:

| Action Category | Target Role | Meaning |
|---|---|---|
| `MONITOR` | Analyst / Coordinator | Maintain active surveillance on identified indicators |
| `VERIFY` | Coordinator / Extension | Confirm on-the-ground reality before commercial commitments |
| `DIVERSIFY` | Buyer / Aggregator | Broaden supplier base or secondary transit corridors |
| `AGGREGATE` | Aggregator / Cooperative | Consolidate volume across smallholders to meet demand |
| `PROCURE` | Commercial Buyer | Review forward off-take contracts and delivery tranches |
| `PROCESS` | Processor / Mill | Mobilize regional drying, milling, or preservation capacity |
| `REDIRECT` | Logistics Operator | Plan alternative highway corridors or destination markets |
| `PREPARE` | Processor / Buyer | Pre-position packaging, intermediate staging, or buffer stock |
| `ESCALATE_FOR_REVIEW`| Coordinator | Formal human review for food security or multi-domain risks |
| `WAIT_AND_MONITOR` | Farmer / Trader | Conditions nominal; continue routine workflows |

Planning horizons:
- `IMMEDIATE`: 0–7 days
- `NEAR_TERM`: 8–30 days
- `MEDIUM_TERM`: 31–90 days

---

## 7. Lifecycle & Immutability

State transitions are strictly server-authoritative:
```
DRAFT ───► REVIEW ───► ACTIVE ───► EXPIRED ───► EVALUATED ───► ARCHIVED
  │          │           │            │
  └──────────┴───────────┴────────────┴────────► CANCELLED
```

Scenarios are immutable historical artifacts:
- Updates never overwrite existing records.
- New evidence creates a new version with incremented `version` and pointer `previous_scenario_id`.

---

## 8. Evaluation & Learning Loop Integration

Integrates directly with Phase 3.4 (`evaluateScenarioAgainstOutcome`):
1. **Directional Accuracy**: Did actual outcome match expected direction?
2. **Timing Accuracy**: Did the event occur within the predicted horizon (`ON_TIME`, `EARLY`, `LATE`)?
3. **False Positive Detection**: Scenario anticipated disruption, but nominal conditions prevailed. Emits `FALSE_POSITIVE_SIGNAL` to Phase 3.4.
4. **False Negative Detection**: Scenario projected nominal conditions, but disruption occurred. Emits `FALSE_NEGATIVE_SIGNAL` to Phase 3.4.

---

## 9. Domain & Safety Boundaries

1. **Physical Security**: Mandatory disclaimer `CORRIDOR_REVIEW_REQUIRED`. Never gives tactical evasion routes or guarantees safety.
2. **Agricultural Biosecurity**: Non-diagnostic analytical indicator disclaimer. Never prescribes chemicals, culls animals, or declares outbreaks.
3. **Food Security**: Prohibits autonomous public alerts. Requires coordinator review (`REVIEW` status).
4. **Anti-Pork**: Zero-tolerance checks at database constraints, runtime validation, evidence ingestion, and tests.
5. **AI Boundary**: Deterministic algorithms are authoritative. AI is strictly an optional plain-language summarizer.
