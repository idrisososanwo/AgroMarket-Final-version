# AgroMarket Phase 2.4: Production Planning & Farm Intelligence Agent

## Production Architecture & Operational Specification

The **Production Planning & Farm Intelligence Agent** is AgroMarket's second specialized agricultural intelligence agent. It establishes a grounded connection between:
1. **Empirical Agricultural Production Context** (`production_units`, `production_outputs`)
2. **Deterministic Market Intelligence** (`price_observations`, `b2b_demands`, `orders`, `market_pressure_snapshots`)
3. **Seasonal Agricultural Calendars** (verifiable Nigerian planting/harvest windows)
4. **Ecosystem Infrastructure Constraints** (downstream processing bottlenecks, equipment availability, corridor security notices, non-diagnostic disease advisories)

---

## 1. Decision-Support Boundary

The agent functions strictly as an **advisory decision-support system**:
- **OBSERVES**: Active production units, reported available harvest quantities, processing facility queues, equipment rental availability, transport delay events, and market pressure indexes.
- **DETECTS**: Potential production opportunities, operational risks, input constraints, and downstream processing bottlenecks.
- **INTERPRETS**: Empirical evidence packages via the controlled Phase 2.2 AI Gateway.
- **RECOMMENDS**: Advisory planning recommendations submitted for human/farmer/business review with status `PROPOSED`.
- **EVALUATES**: Predictions against real production outcomes over 30d, 90d, and seasonal cycles.

### Strict Negative Constraints:
- **No Autonomous Farm Operations**: The agent NEVER autonomously plants, breeds, harvests, alters inventory, moves livestock, rents equipment, or executes input purchases.
- **No Yield or Profit Fabrication**: The agent NEVER claims guaranteed profits or hallucinates harvest yields. If data is sparse, the system explicitly reports `INSUFFICIENT_EVIDENCE`.
- **Non-Diagnostic Veterinary / Agronomy Boundary**: The agent consumes disease risk signals for operational context only; it NEVER diagnoses an animal or crop disease and NEVER prescribes pharmaceutical or chemical treatments.
- **Zero-Tolerance Anti-Pork Policy**: Pig and pork commodities are strictly prohibited across DB triggers, Zod schemas, calculations, AI reasoning packages, and UI filters.

---

## 2. Multi-Domain Support

The agent provides a shared production intelligence abstraction across 4 primary domains:
- **CROPS**: Grain, roots, tubers, vegetables, tree crops, pulses.
- **POULTRY**: Broiler chickens, layers, turkeys, eggs.
- **LIVESTOCK**: Beef cattle, dairy cattle, sheep, goats (permissible halal livestock).
- **AQUACULTURE**: Catfish (Clarias/Heterobranchus), tilapia.

---

## 3. The Observation & Planning Pipeline

```
EMPIRICAL PRODUCTION DATA (production_units, production_outputs)
        +
MARKET INTELLIGENCE SNAPSHOT (price trend, demand status, supply shortage)
        +
SEASONAL CALENDAR (Nigerian agro-ecological peak and shoulder windows)
        +
ECOSYSTEM CONSTRAINTS (processing facility capacity, equipment availability, security notices)
        ↓
DETERMINISTIC EVALUATION
  ├── Production Opportunity Score (0 - 100)
  ├── Production Risk Score (0 - 100)
  ├── Downstream Bottleneck Analysis
  └── Calibrated Advisory Notice
        ↓
EVIDENCE PACKAGE & PRIVACY STRIPPING
        ↓
SAFETY PRE-CHECKS (Anti-pork regex, Nigerian geography validation)
        ↓
CONTROLLED AI REASONING (AI Gateway, structuredReasoningOutputSchema)
        ↓
SAFETY POST-CHECKS
        ↓
ADVISORY RECOMMENDATION (Status: PROPOSED for Human Review)
        ↓
HUMAN / FARMER / BUSINESS DECISION
        ↓
OUTCOME OBSERVATION & EVALUATION
```

---

## 4. Deterministic Scoring Logic

### A. Production Opportunity Score (0.0 to 100.0)
$$\text{Opportunity} = 0.30 \times \text{DemandFactor} + 0.25 \times \text{PriceFactor} + 0.20 \times \text{ShortageFactor} + 0.15 \times \text{SeasonalFit} + 0.10 \times \text{InfrastructureSupport}$$

- **HIGH_OPPORTUNITY**: Score $\ge$ 80
- **ATTRACTIVE**: Score 60 – 79.9
- **MODERATE**: Score 40 – 59.9
- **LOW**: Score < 40

### B. Production Risk Score (0.0 to 100.0)
$$\text{Risk} = 0.25 \times \text{InputConstraints} + 0.25 \times \text{DownstreamBottlenecks} + 0.20 \times \text{Disruptions} + 0.15 \times \text{MarketSoftness} + 0.15 \times \text{DiseaseAdvisory}$$

- **HIGH_RISK**: Score $\ge$ 75
- **ELEVATED**: Score 50 – 74.9
- **MODERATE**: Score 30 – 49.9
- **LOW**: Score < 30

---

## 5. Calibrated Language & Non-Speculative Standards

- **Forbidden Phrases**: "Guaranteed profit", "Plant this now and make millions", "Definite yield of X tonnes", "Administer antibiotic Y".
- **Calibrated Standard**: *"Observed evidence indicates favorable market conditions and supply deficit for Roma Tomatoes in Kano. Production expansion or harvest aggregation may warrant review, subject to input costs, localized processing capacity, and production risks."*

---

## 6. Database Storage & Schema

The agent registers with the central `agricultural_intelligence_agents` table:
- Agent ID: `PRODUCTION_PLANNING_AGENT` (with alias `PRODUCTION_PLANNING`)
- Capabilities: `PRODUCTION_CONTEXT_ANALYSIS`, `MARKET_SIGNAL_INTEGRATION`, `OPPORTUNITY_SCORING`, `RISK_FACTOR_EVALUATION`, `INPUT_CONSTRAINT_MONITORING`, `SEASONAL_WINDOW_ALIGNMENT`, `ADVISORY_RECOMMENDATION`

Empirical calculations are persisted to:
- `production_planning_snapshots`: Append-only snapshots with check constraints `[0, 100]`, level check constraints, anti-pork triggers, and RLS policies.
