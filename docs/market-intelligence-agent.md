# AgroMarket Phase 2.3: Market Intelligence Agent

## Production Architecture & Operational Specification

The **Market Intelligence Agent** is AgroMarket's first specialized agricultural intelligence agent, activated upon the foundational layers of:
- **Phase 2.0**: Agricultural Ecosystem & Value-Chain Coordination Layer
- **Phase 2.1**: Deterministic Agricultural Intelligence Layer
- **Phase 2.2**: AI & Agent Reasoning Foundation (Pre/Post Checks, Gateway, Contracts, Audits)

---

## 1. Core Mission & Decision-Support Boundary

AgroMarket is a Nigerian-first digital agricultural coordination and intelligence ecosystem. 

The Market Intelligence Agent operates strictly as a **decision-support system**:
- It **OBSERVES** market conditions from empirical database records (price observations, B2B demand, completed orders, harvest outputs, aggregation pools, security incidents, and logistics events).
- It **DETECTS** deterministic market signals (price movement, demand fluctuations, supply imbalances, regional differentials, and composite market pressure).
- It **INTERPRETS** empirical evidence using bounded, controlled AI reasoning via the Phase 2.2 AI Gateway.
- It **RECOMMENDS** advisory actions submitted to human/business actors with status `PROPOSED`.
- It **EVALUATES** predictions against real-world outcomes over 7d, 30d, and 90d horizons.

### Critical Negative Constraints:
- **No Autonomous Execution**: The agent NEVER autonomously buys, sells, changes listings, modifies prices, dispatches logistics, alters payments, or allocates inventory.
- **No Chatbot/Unstructured Roleplay**: The agent executes structured data pipelines, returning strictly typed Zod-validated outputs.
- **Authoritative Deterministic Layer**: All price trends, unit conversions, and market pressure indexes are computed deterministically. The AI does not compute arithmetic or hallucinate numbers.
- **Zero-Tolerance Anti-Pork Policy**: Pig and pork commodities are strictly forbidden at database constraints, application validation, AI prompts, and UI layers.
- **No Fabricated Data**: If empirical observations are missing or sparse, the system explicitly outputs `INSUFFICIENT_DATA` / `INSUFFICIENT_EVIDENCE`.

---

## 2. The Observation & Calculation Pipeline

The pipeline follows a deterministic execution flow:

```
RAW DATA
  ↓ (price_observations, b2b_demands, orders, production_outputs, security_incidents)
NORMALIZATION
  ↓ (normalizePrice to canonical NGN/KG or NGN/LITRE)
DETERMINISTIC EVALUATION
  ├── Price Trend (7d, 30d, 90d deltas)
  ├── Demand Analysis (B2B, consumer orders, shared purchase index)
  ├── Supply Analysis (Harvest outputs, aggregation pools, active listings)
  ├── Regional Differentials (Calibrated language: e.g. "Price differential observed: +18.2% in Lagos vs Kano")
  └── Market Pressure Score (0.0 to 100.0)
SIGNAL GENERATION
  ↓ (PRICE_INCREASE, PRICE_DECREASE, DEMAND_INCREASE, SUPPLY_SHORTAGE, SUPPLY_SURPLUS)
EVIDENCE PACKAGING
  ↓ (Evidence budget: character/item limits, privacy stripping)
SAFETY PRE-CHECKS
  ↓ (Anti-pork regex, Nigerian geography validation, objective validation)
AI REASONING DISPATCH
  ↓ (Gemini / OpenAI via AIGateway with fallback)
SAFETY POST-CHECKS
  ↓ (Output validation against structuredReasoningOutputSchema, calibrated language)
ADVISORY RECOMMENDATION
  ↓ (Persisted with status PROPOSED for Human Review)
HUMAN REVIEW & EXECUTION
  ↓
OUTCOME OBSERVATION & EVALUATION
```

---

## 3. Deterministic Market Pressure Index

Market pressure measures composite structural stress on agricultural commodity availability:

$$\text{MarketPressure} = 0.35 \times \text{PricePressure} + 0.30 \times \text{SupplyPressure} + 0.25 \times \text{DemandPressure} + 0.10 \times \text{DisruptionPressure}$$

All component scores are bounded within `[0.0, 100.0]`.

### Classification Levels:
| Score Range | Pressure Level | Interpretation |
| :--- | :--- | :--- |
| `0.0 - 29.9` | **LOW** | Stable market, balanced supply and demand. |
| `30.0 - 49.9` | **MODERATE** | Normal seasonal variations; steady procurement. |
| `50.0 - 69.9` | **ELEVATED** | Emerging pressure; rising wholesale prices or tightening harvest volume. |
| `70.0 - 84.9` | **ACUTE** | Significant market tightness; procurement rationing observed. |
| `85.0 - 100.0` | **CRITICAL** | Severe market stress; compounded by corridor disruptions or sharp deficits. |

---

## 4. Regional Price Differentials & Calibrated Language

The agent compares canonical unit prices between Nigerian states (e.g. Kano production hubs vs Lagos terminal consumption markets).

### Strict Language Calibrations:
- **Forbidden**: "Guaranteed profit", "Arbitrage opportunity", "Farmers will definitely make millions", "Buy immediately".
- **Enforced**: "Price differential observed: 21.4% higher in Lagos compared to Kano. Potential transport and handling costs must be verified before considering commercial redistribution."

---

## 5. Failure & Fallback Behavior

1. **AI Provider Unavailable**:
   - The agent falls back to deterministic calculations and deterministic signal generation.
   - Status is marked `DETERMINISTIC_ONLY`.
   - Returns deterministic advisory recommendations without inventing model commentary.
2. **Insufficient Empirical Evidence**:
   - The agent refuses to hallucinate trends or trends from fewer than 2 comparable observations.
   - Status is marked `INSUFFICIENT_EVIDENCE`.
3. **Safety Violations**:
   - Any prohibited produce (pig/pork) or ungrounded assertions trigger immediate rejection via Phase 2.2 pre/post checks.

---

## 6. Database Storage & Schema

The agent registers with the central `agricultural_intelligence_agents` table:
- Agent ID: `MARKET_INTELLIGENCE_AGENT` (with alias `MARKET_INTELLIGENCE`)
- Capabilities: `PRICE_TREND_ANALYSIS`, `DEMAND_SIGNAL_DETECTION`, `SUPPLY_SHORTAGE_MONITORING`, `REGIONAL_MARKET_COMPARISON`, `MARKET_PRESSURE_INDEXING`, `EVIDENCE_PACKAGING`, `ADVISORY_RECOMMENDATION`

Empirical calculations are persisted to:
- `market_pressure_snapshots`: Append-only snapshots with check constraints `[0, 100]`, level check constraints, anti-pork triggers, and RLS policies.
