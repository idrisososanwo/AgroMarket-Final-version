# Agricultural Memory & Historical Intelligence Layer (Phase 3.5)

## Overview & Purpose

AgroMarket operates as a Nigerian-first digital agricultural coordination and intelligence infrastructure layer:

```
DATA
  ↓
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
OUTCOME
  ↓
EVALUATE
  ↓
LEARN (HISTORICAL MEMORY)
```

The system does not only answer:
> *"What is happening right now?"*

It maintains safe, deterministic memory to answer:
> *"What has happened before?"*  
> *"How does the current market/demand/supply pressure compare to the historical baseline?"*  
> *"How often does this disruption or signal recur?"*  
> *"Which recommendations historically resulted in completed real-world outcomes?"*  
> *"Which regions repeatedly experience specific value-chain constraints?"*  

---

## 1. Temporal Discipline: Event vs. Snapshot vs. Current State

AgroMarket explicitly distinguishes three categories of agricultural records:

| Record Type | Description | Examples |
|---|---|---|
| **`EVENT`** | Discrete historical occurrence or incident with a point-in-time timestamp | Security disruption, biosecurity outbreak notice, severe flood incident, bridge closure |
| **`SNAPSHOT`** | Periodic analytical state at a point in time (append-only ledger) | Daily wholesale price index, weekly corridor delay score, food security vulnerability index |
| **`CURRENT_STATE`** | Live mutable operational state representing active reality | Active farm inventory, open B2B demand requests, pending carrier dispatch |

**Rule**: These three concepts are never treated as interchangeable. Historical memory indexes and aggregates snapshots and events without conflating them with mutable live inventory or orders.

---

## 2. Historical Baselines & Statistical Comparisons

To evaluate whether a live observation represents an anomaly, AgroMarket calculates deterministic historical baselines:

- **Metrics**: Sample mean, median, min, max, standard deviation, and interquartile percentiles ($p_{25}, p_{75}$).
- **Comparison Engine**:
  $$\text{Z-Score} = \frac{\text{Current Value} - \text{Baseline Mean}}{\text{Standard Deviation}}$$
- **Direction Classifications**:
  - `ELEVATED`: Z-score $> +1.0$ (significantly above historical baseline)
  - `NORMAL`: Z-score between $[-1.0, +1.0]$ (within nominal bounds)
  - `DEPRESSED`: Z-score $< -1.0$ (significantly below historical baseline)
  - `VOLATILE`: Standard deviation exceeds 40% of baseline mean
- **Threshold Safeguard**:
  If sample size is below `MIN_BASELINE_SAMPLE_SIZE` (3 observations), the system returns `INSUFFICIENT_DATA`. It **never** fabricates a baseline or manufactures statistical certainty.

---

## 3. Historical Signal Patterns & Recurrence

The historical signal layer tracks recurring patterns across:
- **Frequency Count**: How many times did a signal (e.g. `LOGISTICS_DISRUPTION`, `PRICE_INCREASE`, `SUPPLY_SHORTAGE`) appear in the last 7, 30, 90, or 365 days?
- **Recency**: When was this signal last triggered?
- **Geographic Recurrence**: Which specific Nigerian states or transport corridors repeatedly experience this pressure?
- **Confirmation Rate**: What proportion of historical signals were subsequently supported by verified outcome evidence?

---

## 4. Historical Recommendation Track Record

Building on Phase 3.4, historical memory preserves the full chain:
$$\text{Recommendation} \to \text{Decision} \to \text{Action} \to \text{Outcome} \to \text{Evidence} \to \text{Evaluation} \to \text{Learning Signal}$$

The system answers:
> *"Show previous recommendations of this type and what happened afterward."*

- **Decision Distribution**: Historical acceptance, rejection, deferral, and dismissal rates.
- **Real-World Verification**: Proportion of accepted recommendations that resulted in verified completed outcomes (e.g. `SUPPLY_SOURCED`, `PROCUREMENT_COMPLETED`).
- **Usefulness Track Record**: Average evaluation score and percentage of times human actors rated the recommendation as `USEFUL` or `VERY_USEFUL`.

---

## 5. Provenance & Data Quality Awareness

Historical memory preserves evidence provenance:
- Provenance Natures: `OBSERVED`, `DERIVED`, `CORRELATED`, `ESTIMATED`, `UNKNOWN`.
- Integration with Phase 3.4 Data Quality Auditing:
  - Queries automatically exclude observations flagged with `CRITICAL` or `HIGH` data quality flaws (e.g., impossible negative values, extreme staleness, or missing provenance).
  - Questionable records are never silently erased; they remain recorded in `agricultural_data_quality_issues`.

---

## 6. Regional & Commodity Memory

- **Regional Aggregation**: Supports National, Regional (Geopolitical Zone), State, and LGA levels.
- **Privacy Boundary**: Zero storage or disclosure of exact private farm GPS coordinates, cadastral survey data, or phone numbers.
- **Commodity Memory**: Strictly enforced anti-pork zero tolerance. No pig/pork terms (`pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine`) are permitted across historical baselines, observations, or query filters.

---

## 7. AI Boundaries

- **Advisory Role**: AI reasoning is strictly advisory interpretation and natural language explanation.
- **Deterministic System of Record**: Historical memory, baseline statistics, z-scores, and error calculations are computed via deterministic math and stored in immutable database tables.
- **No LLM Writing Truth**: LLMs can read historical evidence packages within an allocated token budget, but can never directly modify or write historical truth.
