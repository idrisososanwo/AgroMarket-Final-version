# AgroMarket Phase 3.6: Multi-Horizon Forecasting & Predictive Intelligence Layer

## 1. Architectural Overview & Core Purpose

AgroMarket is a Nigerian-first digital agricultural coordination and intelligence infrastructure layer. The end-to-end backend intelligence flow progresses deterministically:

```
DATA
  → OBSERVE (Phase 2.1)
  → ANALYZE (Phase 2.3–3.0)
  → DETECT (Phase 3.1)
  → ORCHESTRATE (Phase 3.1)
  → RECOMMEND (Phase 3.1)
  → DECIDE (Phase 3.2)
  → ACT (Phase 3.3)
  → OUTCOME (Phase 3.4)
  → EVALUATE (Phase 3.4)
  → LEARN (Phase 3.4)
  → MEMORY (Phase 3.5)
  → FORECAST (Phase 3.6)
```

Phase 3.5 provided the historical memory layer ("What happened before?"). Phase 3.6 establishes the multi-horizon predictive layer:

$$\text{HISTORICAL MEMORY} + \text{CURRENT CONDITIONS} \longrightarrow \text{FORECAST} \longrightarrow \text{OBSERVED OUTCOME} \longrightarrow \text{EVALUATION}$$

Forecasts remain strictly **advisory decision-support indicators**. They never trigger autonomous fund movements, order dispatches, or emergency mandates.

---

## 2. Multi-Horizon Forecasting Disciplines

Agricultural operations operate across distinct temporal horizons:

| Horizon | Window | Primary Use Case | Recommended Method |
| :--- | :--- | :--- | :--- |
| **SHORT_TERM_0_7D** | 0 to 7 days | Spot pricing, logistics dispatch, truck congestion, off-take bottlenecks | `WEIGHTED_MOVING_AVERAGE` |
| **MEDIUM_TERM_8_30D** | 8 to 30 days | Monthly procurement cycles, aggregation pool fill, regional corridor shifts | `TREND_EXTRAPOLATION` |
| **LONG_TERM_31_90D** | 31 to 90 days | Seasonal harvest arrivals, quarterly food security reserves, production planning | `HISTORICAL_BASELINE_COMPARISON` |

---

## 3. Deterministic Forecasting Methods

AgroMarket avoids opaque black-box models in favor of transparent, explainable deterministic algorithms:

1. **Simple Moving Average (`MOVING_AVERAGE`)**:
   $$\bar{X} = \frac{1}{k} \sum_{i=1}^k X_i$$
2. **Weighted Moving Average (`WEIGHTED_MOVING_AVERAGE`)**:
   Weights recent observations higher to reflect changing local conditions:
   $$\hat{X} = \frac{\sum_{i=1}^n i \cdot X_i}{\sum_{i=1}^n i}$$
3. **Trend Extrapolation (`TREND_EXTRAPOLATION`)**:
   Linear least-squares regression projecting rate of change over the horizon window.
4. **Historical Baseline Comparison (`HISTORICAL_BASELINE_COMPARISON`)**:
   Applies a horizon-weighted mean-reversion pull toward Phase 3.5 historical baselines:
   $$\hat{X} = X_{\text{current}} \cdot (1 - w) + \mu_{\text{baseline}} \cdot w \quad (w = \min(0.7, \text{days}/90))$$
5. **Exponentially Weighted Trend (`EXPONENTIALLY_WEIGHTED_TREND`)**:
   Applies an alpha smoothing factor ($\alpha = 0.3$) across chronologically ordered points.

---

## 4. Insufficient-Data Governance (Zero-Tolerance for Fabricated Metrics)

The forecasting engine enforces strict statistical boundaries:
- **Minimum Sample Threshold ($N < 3$)**: If fewer than 3 empirical observations exist for a metric, domain, commodity, and state, the engine **must halt quantitative projection** and return:
  - `status: "INSUFFICIENT_DATA"`
  - `confidenceLevel: "INSUFFICIENT_DATA"`
  - `confidence: 0.0`
  - `direction: "UNKNOWN"`
  - `predictedValue: null`
- **Zero Constants**: Arbitrary defaults or synthetic trends are strictly forbidden.

---

## 5. Confidence Methodology

Confidence is calculated deterministically based on:
1. **Sample Size ($N$)**: Larger sample pools scale confidence upward.
2. **Data Completeness Ratio**: Measures observation density over the temporal window.
3. **Horizon Uncertainty Penalty**: Longer horizons incur an automatic analytical discount.
4. **Volatility Penalty**: High coefficients of variation ($CV > 0.40$) reduce confidence.
5. **Quality Penalties**: Stale observations or quarantined flags decrease the confidence score.

Confidence levels are classified into:
- `HIGH` ($\ge 0.75$)
- `MODERATE` ($0.50 \le \text{Score} < 0.75$)
- `LOW` ($0.10 \le \text{Score} < 0.50$)
- `INSUFFICIENT_DATA` ($0.0$)

---

## 6. Forecast Immutability & Versioning Lineage

Forecasts are immutable historical artifacts:
- When new observations or updated evidence arrive, the existing forecast record is **never overwritten**.
- Instead, [`createForecastVersion`](file:///c:/Users/Ososanwo%20Idris/Documents/AGROMARKET-%20Final%20version/src/features/forecasting/engine.ts) creates a new record with:
  - `version = previous_forecast.version + 1`
  - `previous_forecast_id = previous_forecast.id`
- This ensures full auditability and enables Phase 3.4 to evaluate how forecast accuracy evolved over time.

---

## 7. Feedback & Evaluation Loop Integration (Phase 3.4)

When the target horizon arrives and ground-truth reality is recorded, [`evaluateForecast`](file:///c:/Users/Ososanwo%20Idris/Documents/AGROMARKET-%20Final%20version/src/features/forecasting/evaluation.ts) evaluates performance:
1. **Absolute Error**:
   $$E_{\text{abs}} = |\hat{X} - X_{\text{actual}}|$$
2. **Percentage Error (Zero-Divide Guarded)**:
   $$E_{\text{pct}} = \frac{|\hat{X} - X_{\text{actual}}|}{|X_{\text{actual}}|} \times 100 \quad (X_{\text{actual}} \neq 0)$$
   If $X_{\text{actual}} = 0$, $E_{\text{pct}}$ returns `null` to prevent division-by-zero crashes.
3. **Directional Accuracy**: Compares predicted trajectory (`INCREASING`, `DECREASING`, `STABLE`) against actual outcome.
4. **Range Compliance**: Checks whether $X_{\text{actual}} \in [\text{low}, \text{high}]$.
5. **Evaluation Score**: Multi-factor performance score (40% direction, 30% range, 30% error). If score $< 0.60$, a learning signal is suggested.

---

## 8. Domain Safety Boundaries & Human-Review Mandates

1. **Disease & Biosecurity**:
   - Strictly an **analytical indicator**.
   - Must never diagnose animal/crop disease, prescribe antibiotics/pesticides, order culling, or declare statutory quarantines.
   - Retains the non-veterinary regulatory disclaimer.
2. **Logistics & Movement**:
   - Analyzes movement delay and corridor friction.
   - Must never guarantee safe passage or claim unimpeded routes. Marks `CORRIDOR_REVIEW_REQUIRED` on elevated friction.
3. **Food Security**:
   - Internal resilience early indicator.
   - Never auto-publishes public emergencies; human institutional review remains mandatory.

---

## 9. Commodity Memory & Anti-Pork Enforcement

AgroMarket strictly prohibits all pig and pork commodities across the entire ecosystem:
- Database schema constraint: `chk_no_pork_intelligence_predictions`
- Zod schema validation: rejects `pork`, `pig`, `swine`, `hog`, `bacon`, `ham`, `lard`, `porcine`
- Runtime validator: [`assertNoProhibitedProduce`](file:///c:/Users/Ososanwo%20Idris/Documents/AGROMARKET-%20Final%20version/src/features/forecasting/validation.ts) throws an immediate exception.

---

## 10. Privacy & Regional Safeguards

- Geographic aggregation is supported at National, Corridor, State (36 States + FCT), and LGA municipal levels.
- Strict privacy validator [`assertNoPrivateInformation`](file:///c:/Users/Ososanwo%20Idris/Documents/AGROMARKET-%20Final%20version/src/features/forecasting/validation.ts) blocks raw farm GPS coordinates, personal phone numbers, and direct farmer PII.

---

## 11. AI Boundary

- Authoritative predictive values, baselines, and errors are calculated **strictly by deterministic TypeScript code**.
- AI agents may later consume forecasts within their bounded evidence budgets to generate human-readable explanations.
- AI outputs can never alter, overwrite, or fabricate historical or forecasted data.
