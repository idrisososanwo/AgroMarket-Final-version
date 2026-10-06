# Agricultural Intelligence Orchestration & Cross-Domain Decision Engine

## AgroMarket Phase 3.1 Architecture & Technical Specification

---

### 1. Executive Summary & Architecture Overview

The **Agricultural Intelligence Orchestration & Cross-Domain Decision Engine** (`AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR`, role: `ORCHESTRATION_LAYER`) serves as the central coordination layer above AgroMarket's eight specialized domain intelligence agents:

1. **Market Intelligence Agent** (`MARKET_INTELLIGENCE_AGENT`) — Wholesale prices, price volatility, market pressure.
2. **Production Planning Agent** (`PRODUCTION_PLANNING_AGENT`) — Harvest schedules, crop yields, farmgate volume.
3. **Demand Forecasting Agent** (`DEMAND_FORECASTING_AGENT`) — Consumer demand, order volume trends, urban off-take.
4. **Supply Matching Agent** (`SUPPLY_MATCHING_AGENT`) — Producer aggregation, matching quality, deficit identification.
5. **Procurement Intelligence Agent** (`PROCUREMENT_INTELLIGENCE_AGENT`) — B2B purchase contracts, supplier diversity, fulfillment risk.
6. **Food Security & Resilience Agent** (`FOOD_SECURITY_RESILIENCE_AGENT`) — Vulnerability indexing, food affordability, regional availability.
7. **Logistics Intelligence Agent** (`LOGISTICS_INTELLIGENCE_AGENT`) — Corridor transit friction, delivery reliability, freight delays.
8. **Agricultural Disease & Biosecurity Agent** (`AGRICULTURAL_DISEASE_BIOSECURITY_AGENT`) — Health signal convergence, biosecurity dependencies, early warning.

The Orchestrator does **NOT** replace any specialized agent. Each domain agent remains the authoritative source of truth for its own deterministic metrics. The Orchestrator gathers their outputs, normalizes them, detects multi-sector scenarios and contradictions, calculates a unified systemic priority score, and produces governed, human-reviewed advisory recommendations.

```
SPECIALIZED AGENTS (Market, Production, Demand, Supply, Procurement, Food Security, Logistics, Biosecurity)
                                  ↓
                        AGENT OUTPUT CONTRIBUTIONS
                                  ↓
                      ORCHESTRATION CONTEXT GATHERING
                                  ↓
                         CROSS-DOMAIN CORRELATION
                                  ↓
           ┌──────────────────────┴──────────────────────┐
           ↓                                             ↓
CONFLICT DETECTION                              SCENARIO DETECTION
           ↓                                             ↓
CONFIDENCE CALIBRATION                          PRIORITY SCORING (0-100)
           └──────────────────────┬──────────────────────┘
                                  ↓
                       ADVISORY AI INTERPRETATION (Phase 2.2 Gateway)
                                  ↓
                       CROSS-DOMAIN RECOMMENDATIONS
                                  ↓
                         HUMAN REVIEW GATE (Mandatory)
                                  ↓
                         BUSINESS ACTION / EXECUTION
                                  ↓
                         REAL-WORLD OUTCOME LINKAGE
                                  ↓
                        EVALUATION & MEMORY FEEDBACK
```

---

### 2. Normalized Agent Output Contract

Each specialized agent contributes to the orchestration context through a standardized, privacy-preserving contract:

| Field | Type | Description |
| :--- | :--- | :--- |
| `agentId` | `string` | Unique identifier of contributing agent |
| `agentType` | `string` | Agent classification (`SPECIALIZED_AGENT`, `FOUNDATION_SIGNAL`) |
| `domain` | `SpecializedAgentDomain` | Domain sector: `MARKET`, `PRODUCTION`, `DEMAND`, `SUPPLY`, `PROCUREMENT`, `FOOD_SECURITY`, `LOGISTICS`, `DISEASE_BIOSECURITY` |
| `geographicScope` | `AgentGeographicScope` | Granular regional scope (`state`, `lga`, `geopoliticalZone`, `corridor`, `tradingHub`) |
| `commodity` | `string \| null` | Permitted Nigerian agricultural commodity (e.g. Maize, Sorghum, Cassava) |
| `commodityCategory` | `string \| null` | Produce category (`GRAINS`, `TUBERS`, `POULTRY`, `LIVESTOCK`, `LEGUMES`) |
| `signalType` | `string` | Domain signal enum (e.g. `PRICE_INCREASE`, `SUPPLY_SHORTAGE`, `CORRIDOR_DISRUPTION`) |
| `severity` | `LOW \| MEDIUM \| HIGH \| CRITICAL` | Standardized severity assessment |
| `score` | `number` | Deterministic domain score ($0 - 100$) |
| `confidence` | `number` | Model calculation confidence ($0.0 - 1.0$) |
| `evidenceConfidence` | `number` | Grounded evidence credibility ($0.0 - 1.0$) |
| `evidenceCount` | `number` | Number of supporting empirical records |
| `observationTime` | `string` (ISO-8601) | Timestamp of underlying observation |
| `sourceReferences` | `string[]` | Sanitized public or platform source citations |
| `affectedValueChainStage`| `ValueChainStage` | Value chain segment: `PRODUCTION`, `AGGREGATION`, `PROCESSING`, `LOGISTICS`, `DISTRIBUTION`, `RETAIL`, `CONSUMPTION` |
| `dependencies` | `string[]` | Identified single-point bottlenecks |
| `limitations` | `string[]` | Domain analytical boundaries |

---

### 3. Cross-Domain Correlation & Temporal Windows

Correlation requires meaningful overlap across both geography and time:
* **Geographic Matching**: Correlated on identical or adjacent states, LGAs, or primary transit corridors.
* **Commodity Matching**: Correlated on exact commodity or shared commodity category.
* **Temporal Correlation Windows**:
  * `SHORT_TERM`: $\le 7$ days (acute volatility, immediate disruptions)
  * `MEDIUM_TERM`: $8 - 30$ days (seasonal trends, medium-distance freight, aggregation cycles)
  * `LONGER_TERM`: $31 - 90$ days (planting schedules, macroeconomic trends, crop cycles)

---

### 4. Same-Source Deduplication

When multiple domain agents ingest the same underlying public report (e.g., an NVRI epidemiology bulletin or NBS wholesale price index), the orchestrator deduplicates sources. Evidence credibility is calculated based on **distinct underlying institutions and field reports**, preventing synthetic confidence inflation from circular citations.

---

### 5. Intelligence Conflict Detection & Confidence Degradation

Contradictions between specialized agents represent vital early-warning signals of value-chain friction or data divergence.

#### Common Contradiction Types
1. **Market Surplus vs. Supply Shortage (`MARKET_SUPPLY_CONTRADICTION`)**:
   Wholesale prices drop while physical matching indicates a supply deficit. Flags potential speculative dumping or localized holding.
2. **Demand Decrease vs. High Procurement Pressure (`DEMAND_PROCUREMENT_DISPARITY`)**:
   Consumer demand falls while industrial off-takers rush to buy. Indicates institutional stockpiling.
3. **Production Boom vs. Severe Disease Loss (`PRODUCTION_DISEASE_DIVERGENCE`)**:
   Production forecasts project harvest expansion while veterinary bulletins flag acute mortality. Indicates localized cluster failure.
4. **Nominal Corridor Flow vs. Supply Inaccessibility (`LOGISTICS_SUPPLY_ROUTE_DISCREPANCY`)**:
   Highway telemetry shows smooth transit while supply matching reports deliveries failing. Flags first-mile rural feeder road collapse.

#### Confidence Degradation
When conflicts exist:
$$\text{Orchestration Confidence} = \text{Baseline Confidence} - \sum \text{Conflict Penalty (capped at 0.50)}$$
Contradictions are persisted in `agricultural_intelligence_conflicts` for mandatory human reconciliation.

---

### 6. Deterministic Cross-Domain Scenario Detection

The engine evaluates signals against deterministic scenario conditions:

| Scenario Type | Trigger Logic | Policy & Phrasing Requirements |
| :--- | :--- | :--- |
| `MULTI_DOMAIN_RISK_SCENARIO` | $\ge 3$ independent domains with score $\ge 60$ or severity `HIGH`/`CRITICAL` | Comprehensive cross-domain mitigation protocol. |
| `DISEASE_SUPPLY_RISK_SCENARIO` | Disease risk index $\ge 50$ + production loss or supply gap $\le 45$ | **Non-Causation**: Must use *"potentially associated with"* or *"may contribute to"*. Never asserts clinical causality. |
| `LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO` | Logistics pressure $\ge 55$ / bottleneck + supply gap $\le 50$ | Recommends secondary feeder corridors and dispatch staggering. |
| `PROCUREMENT_RISK_SCENARIO` | Procurement risk $\ge 60$ + high demand or low regional supply | Advises de-concentration of single-supplier contracts. |
| `FOOD_SECURITY_PRESSURE_SCENARIO` | Food security pressure $\ge 60$ + supply or market stress | Recommends strategic grain reserve allocation and fair-access quotas. |
| `SUPPLY_SHORTAGE_SCENARIO` | Demand $\ge 55$ + supply $\le 45$ + price pressure $\ge 55$ | Coordinates rapid aggregation across smallholder cooperatives. |
| `BALANCED_NOMINAL_SCENARIO` | No elevated sector pressures detected | Routine surveillance. |

---

### 7. Deterministic Cross-Domain Priority Score ($0 - 100$)

$$\text{Priority} = \min\left(100, \sum_{i=1}^{8} W_i \cdot C_i + \text{ConflictUrgencyBonus}\right)$$

| Component ($C_i$) | Weight ($W_i$) | Maximum Points | Description |
| :--- | :---: | :---: | :--- |
| **Cross-Domain Severity** | $25\%$ | $25.0$ | Normalized average score across contributing domain outputs |
| **Evidence Confidence** | $20\%$ | $20.0$ | Credibility of underlying empirical source citations |
| **Food-Security Exposure** | $15\%$ | $15.0$ | Vulnerability of local household diet and staples |
| **Supply Exposure** | $15\%$ | $15.0$ | Acute deficit magnitude in regional physical produce |
| **Geographic Concentration** | $10\%$ | $10.0$ | Single-state / few-LGA cluster vulnerability ($10.0$ vs $4.0$) |
| **Logistics Exposure** | $5\%$ | $5.0$ | Arterial corridor dependency score |
| **Procurement Exposure** | $5\%$ | $5.0$ | B2B supplier concentration ratio |
| **Time Sensitivity** | $5\%$ | $5.0$ | Urgency based on scenario type ($2.0 - 5.0$) |

#### Classification Tiers
* `CRITICAL`: $80.0 - 100.0$
* `HIGH`: $60.0 - 79.9$
* `MEDIUM`: $40.0 - 59.9$
* `LOW`: $< 40.0$

---

### 8. AI Gateway Role & Advisory Separation

The Orchestrator dispatches to Phase 2.2 AI Gateway (`AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR`) strictly for **advisory strategic interpretation**:
* **Inputs to AI**: Normalized, anonymized JSON evidence package.
* **Privacy Pre-Filters**: Strips all farmer PII, phone numbers, cadastral coordinates, and buyer identities.
* **Forbidden AI Capabilities**:
  * Cannot issue veterinary clinical diagnoses or prescriptions.
  * Cannot declare statutory disease outbreaks or quarantine orders.
  * Cannot guarantee road safety or safe passage.
  * Cannot trigger autonomous purchasing, culling, or contract execution.
* **Deterministic Fallback**: If the AI Gateway is unreachable or offline, the engine outputs full deterministic conclusions without loss of quantitative functionality.

---

### 9. Governed Human-in-the-Loop Recommendation Lifecycle

Recommendations follow a strict audited state machine:

$$\text{PROPOSED} \xrightarrow{\text{Admin Review}} \text{REVIEWED} \xrightarrow{\text{Approval}} \text{ACCEPTED} \xrightarrow{\text{Dispatch}} \text{ACTIONED} \xrightarrow{\text{Outcome Link}} \text{COMPLETED}$$

Alternatively, recommendations can be transitioned to `REJECTED`.

Every recommendation includes the mandatory disclaimer:
> *"Cross-domain advisory recommendation only. Requires human verification before execution. No autonomous purchasing, movement, or transactions."*

---

### 10. Outcome Linkage & Evaluation Loop

When a recommendation is actioned, administrators record observed real-world results in `agricultural_orchestration_outcomes`:
* **Action Taken**: Concrete intervention executed by the user/business.
* **Observed Outcome vs. Expected Outcome**: Empirical measurement.
* **Variance**: Documented deviation from model projections.
* **Evaluation Score ($0 - 100$)**: Effectiveness rating used to calibrate future model confidence.
* **Lessons Learned**: Recorded memory informing future multi-agent weighting.

---

### 11. Security, Privacy, and Zero Pig/Pork Enforcement

* **Zero Pig/Pork Produce Invariant**:
  Hard PostgreSQL check constraints on `agricultural_orchestration_snapshots`, `agricultural_orchestration_recommendations`, `agricultural_intelligence_conflicts`, and `agricultural_orchestration_outcomes`. TypeScript validation with `assertNoProhibitedProduce()` across all inputs, models, and actions.
* **Commercial Privacy**:
  Zero farm-level coordinates or individual farmer phone numbers are ever exposed. Data is aggregated to LGA, State, and Corridors.
* **Immutable Snapshot Protection**:
  PostgreSQL `BEFORE UPDATE` trigger on `agricultural_orchestration_snapshots` prevents modification or overwriting of historical intelligence.
